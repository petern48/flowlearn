from flask import Blueprint, request, jsonify
import google.generativeai as genai
import os
from typing import List, Dict
import random
import json
import re
from werkzeug.utils import secure_filename
import tempfile
# Import the Aryn SDK
from aryn_sdk.partition import partition_file
from dotenv import load_dotenv

load_dotenv()
# Initialize Gemini
genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
model = genai.GenerativeModel('gemini-2.0-flash')

word_graph_bp = Blueprint('word_graph', __name__)

@word_graph_bp.route('/api/word-graph/generate', methods=['POST'])
def generate_word_graph():
    try:
        data = request.get_json()
        topic = data.get('topic', 'Technology')
        num_words = data.get('num_words', 5)

        # Generate words related to the topic
        prompt = f"""Generate {num_words} key concepts or terms related to {topic}.
        For each term, provide:
        1. A brief summary (1-2 sentences)
        2. A detailed description (2-3 paragraphs)
        3. 2-3 related concepts (IMPORTANT: make sure these are actual terms that could appear as other nodes)
        4. 2-3 practical examples or use cases
        
        Format the response as a JSON object with the following structure:
        {{
            "words": [
                {{
                    "term": "term name",
                    "summary": "brief summary",
                    "description": "detailed description",
                    "related_concepts": ["concept1", "concept2"],
                    "examples": ["example1", "example2"]
                }}
            ]
        }}"""

        prompt = f"""
        Pretend you are a teacher, trying to walk a student through what to learn to approach a problem.
        Create a list of execution tasks ("nodes") that the student should learn to eventually solve the problem.

        This should generate a dependency graph of execution stages. Format the response as a JSON object with the following structure:

        {{
            "words": [
                {{
                    "term": "taskName",
                    "summary": "brief summary",
                    "description" "description of the task",
                    "related_concepts": ["next_task_1", "next_task_2"],
                    "examples": ["example1", "example2"]
                }}
            ]
        }}

        "related_concepts" is like "next_stage." It should represent nodes where the student can perform after learning the current node (forming a directed edge).
        The values of these should EXACTLY match a corresponding "task" value in another node.

        Requirements of the graph: All nodes must be connected. All nodes must eventually lead to one final node, indicating the goal.
        When there are multiple ways to do something, indicate so by making the paths diverage, to form a DAG that's not a straight line.
        Prefer to avoid just a single straight line of nodes when possible.
        Try to target around 5-10 nodes for most goals.

        Here is the problem:
        {topic}
        """

        # Generate content using Gemini
        response = model.generate_content(prompt)
        if not response.text:
            raise ValueError("Empty response from Gemini")

        # Parse the response and extract JSON
        try:
            # Extract JSON from the response
            json_match = re.search(r'\{.*\}', response.text, re.DOTALL)
            if not json_match:
                raise ValueError("Could not find JSON in response")
            
            words_data = json.loads(json_match.group())
            if not isinstance(words_data, dict) or 'words' not in words_data:
                print("words_data", words_data)
                raise ValueError("Invalid JSON structure")
        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to parse JSON: {str(e)}")

        words = words_data['words']
        
        # Create a dictionary to map terms to their indices
        term_to_index = {word['term'].lower(): i for i, word in enumerate(words)}
        
        # Generate correlations based on related concepts
        correlations = []
        for i, word1 in enumerate(words):
            # Check if any of word1's related concepts match other nodes' terms
            for related_concept in word1.get('related_concepts', []):
                related_concept_lower = related_concept.lower()
                # If the related concept exists as a node
                if related_concept_lower in term_to_index:
                    j = term_to_index[related_concept_lower]
                    # Don't create self-loops
                    if i != j:
                        correlations.append({
                            'source': f"node-{i}",
                            'target': f"node-{j}",
                            'explanation': f"{word1['term']} includes {related_concept} as a related concept"
                        })
                        
            # Also check if this word is mentioned in other nodes' related concepts
            for j, word2 in enumerate(words):
                if i != j:  # Don't create self-loops
                    if any(word1['term'].lower() == related.lower() for related in word2.get('related_concepts', [])):
                        correlations.append({
                            'source': f"node-{j}",
                            'target': f"node-{i}",
                            'explanation': f"{word2['term']} includes {word1['term']} as a related concept"
                        })

        # Format the response for React Flow
        nodes = [
            {
                'id': f"node-{i}",
                'data': {
                    'label': word['term'],
                    'summary': word['summary'],
                    'description': word['description'],
                    'relatedTopics': word['related_concepts'],
                    'examples': word['examples']
                },
                'position': {'x': i * 250, 'y': 0},
                'type': 'wordNode',
                'sourcePosition': 'right',
                'targetPosition': 'left'
            }
            for i, word in enumerate(words)
        ]

        edges = [
            {
                'id': f"edge-{i}",
                'source': corr['source'],
                'target': corr['target'],
                'animated': True,
                'type': 'smoothstep',
                # 'style': {'stroke': '#3b82f6', 'strokeWidth': 2},
                'data': {'explanation': corr['explanation']}
            }
            for i, corr in enumerate(correlations)
        ]

        return jsonify({
            'nodes': nodes,
            'edges': edges
        })

    except Exception as e:
        print(f"Error in generate_word_graph: {str(e)}")
        return jsonify({'error': str(e)}), 500

@word_graph_bp.route('/api/word-graph/upload', methods=['POST'])
def upload_file_for_graph():
    try:
        # Check if the post request has the file part
        if 'file' not in request.files:
            return jsonify({'error': 'No file part'}), 400
        
        file = request.files['file']
        topic = request.form.get('topic', '')
        
        # If user does not select file, browser submits an empty part without filename
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400
        
        # Make sure the filename is safe
        filename = secure_filename(file.filename)
        file_ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
        
        # Check if it's a valid file type
        if file_ext not in ['pdf', 'png', 'jpg', 'jpeg']:
            return jsonify({'error': 'File type not supported. Please upload PDF or image files.'}), 400
        
        # Create a temporary file to store the uploaded content
        with tempfile.NamedTemporaryFile(delete=False, suffix=f'.{file_ext}') as temp:
            file.save(temp.name)
            temp_path = temp.name
        
        # Process the file with Aryn SDK
        content_text = process_file_with_aryn(temp_path, file_ext)
        
        # Clean up the temporary file
        os.unlink(temp_path)
        
        # Extract content from the file
        if not content_text:
            return jsonify({'error': 'Could not extract content from file'}), 400
        
        # Generate topic if not provided
        if not topic:
            # Use a simple prompt to extract the main topic from the content
            topic_prompt = f"Read the following content and identify the main subject or topic in 1-3 words only:\n\n{content_text[:1500]}"
            topic_response = model.generate_content(topic_prompt)
            topic = topic_response.text.strip()
        
        # Use the extracted content to generate the graph
        prompt = f"""Based on the following content about {topic}, generate 5 key concepts or terms related to this topic.
        
        Content: {content_text[:4000]}
        
        For each term, provide:
        1. A brief summary (1-2 sentences)
        2. A detailed description (2-3 paragraphs)
        3. 2-3 related concepts (IMPORTANT: make sure these are actual terms that could appear as other nodes)
        4. 2-3 practical examples or use cases
        
        Format the response as a JSON object with the following structure:
        {{
            "words": [
                {{
                    "term": "term name",
                    "summary": "brief summary",
                    "description": "detailed description",
                    "related_concepts": ["concept1", "concept2"],
                    "examples": ["example1", "example2"]
                }}
            ]
        }}"""

        # Generate content using Gemini
        response = model.generate_content(prompt)
        if not response.text:
            raise ValueError("Empty response from Gemini")

        # Parse the response and extract JSON
        try:
            # Extract JSON from the response
            json_match = re.search(r'\{.*\}', response.text, re.DOTALL)
            if not json_match:
                raise ValueError("Could not find JSON in response")
            
            words_data = json.loads(json_match.group())
            if not isinstance(words_data, dict) or 'words' not in words_data:
                raise ValueError("Invalid JSON structure")
        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to parse JSON: {str(e)}")

        words = words_data['words']
        
        # Create a dictionary to map terms to their indices
        term_to_index = {word['term'].lower(): i for i, word in enumerate(words)}
        
        # Generate correlations based on related concepts
        correlations = []
        for i, word1 in enumerate(words):
            # Check if any of word1's related concepts match other nodes' terms
            for related_concept in word1.get('related_concepts', []):
                related_concept_lower = related_concept.lower()
                # If the related concept exists as a node
                if related_concept_lower in term_to_index:
                    j = term_to_index[related_concept_lower]
                    # Don't create self-loops
                    if i != j:
                        correlations.append({
                            'source': f"node-{i}",
                            'target': f"node-{j}",
                            'explanation': f"{word1['term']} includes {related_concept} as a related concept"
                        })
                        
            # Also check if this word is mentioned in other nodes' related concepts
            for j, word2 in enumerate(words):
                if i != j:  # Don't create self-loops
                    if any(word1['term'].lower() == related.lower() for related in word2.get('related_concepts', [])):
                        correlations.append({
                            'source': f"node-{j}",
                            'target': f"node-{i}",
                            'explanation': f"{word2['term']} includes {word1['term']} as a related concept"
                        })

        # Format the response for React Flow
        nodes = [
            {
                'id': f"node-{i}",
                'data': {
                    'label': word['term'],
                    'summary': word['summary'],
                    'description': word['description'],
                    'relatedTopics': word['related_concepts'],
                    'examples': word['examples']
                },
                'position': {'x': i * 250, 'y': 0},
                'type': 'wordNode',
                'sourcePosition': 'right',
                'targetPosition': 'left'
            }
            for i, word in enumerate(words)
        ]

        edges = [
            {
                'id': f"edge-{i}",
                'source': corr['source'],
                'target': corr['target'],
                'animated': True,
                'style': {'stroke': '#3b82f6', 'strokeWidth': 2},
                'data': {'explanation': corr['explanation']}
            }
            for i, corr in enumerate(correlations)
        ]

        return jsonify({
            'nodes': nodes,
            'edges': edges
        })

    except Exception as e:
        print(f"Error in upload_file_for_graph: {str(e)}")
        return jsonify({'error': str(e)}), 500

def process_file_with_aryn(file_path, file_ext):
    """
    Process a file using the Aryn SDK to extract text content.
    
    Args:
        file_path: Path to the temporary file
        file_ext: File extension (pdf, png, jpg, jpeg)
        
    Returns:
        Extracted text content from the file
    """
    try:
        # Get Aryn API key from environment variable
        api_key = os.getenv('ARYN_API_KEY')
        if not api_key:
            raise ValueError("ARYN_API_KEY environment variable not set")
        
        # Determine text mode based on file type
        text_mode = "standard_ocr" if file_ext in ['png', 'jpg', 'jpeg'] else "vision_ocr"
        
        # Use Aryn SDK to process the file
        with open(file_path, "rb") as f:
            data = partition_file(
                f,
                aryn_api_key=api_key,
                text_mode=text_mode,
                extract_table_structure=True,
                extract_images=True
            )
        
        # Get elements from the response
        # Print all elements for debugging
        print("Aryn SDK Response Elements:")
        print(json.dumps(data.get('elements', []), indent=2))

        context_chunks = []

        for element in data.get('elements', []):
            if 'text_representation' in element:
                text = element['text_representation']
                if text is not None:
                    context_chunks.append(text)
                        
        
        # Combine all chunks
        combined_text = "\n".join(context_chunks)
        
        return combined_text
    
    except Exception as e:
        print(f"Error processing file with Aryn SDK: {str(e)}")
        raise 