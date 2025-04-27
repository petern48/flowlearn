Required env vars:
- GEMINI_API_KEY
- GOOGLE_API_KEY
- ARYN_API_KEY
- BACKEND_HOST (defaults to "http://localhost:8000")

Current Overall Workflow

User Interface (Frontend)
- The React app displays a word graph visualization using React Flow
- Users can enter a topic and click "Generate Graph"
- When a node is clicked, a detailed panel shows more information

Backend API
- Flask server provides endpoints for generating word graphs
- Uses Gemini AI to generate content and correlations

Data Flow
- Frontend requests data from backend with a topic
- Backend uses Gemini to generate related words and correlations
- Data is formatted and returned to frontend
- Frontend renders the graph with nodes and edges

Detailed Workflow Breakdown:
1. Frontend Initialization
The app starts with App.tsx rendering the WordGraph component
WordGraph initially shows an empty graph with a topic input field
On initial load, it calls the backend to generate a graph for the default topic "Technology"
2. Graph Generation Process
When a user enters a topic and clicks "Generate Graph":
Frontend API Call:
The generateGraph function in WordGraph.tsx makes a POST request to /api/word-graph/generate
It sends the topic and number of words (5 by default)
Backend Processing:
The word_graph_bp blueprint in word_graph.py handles the request
It prompts Gemini to generate words related to the topic, including:
Term names
Summaries
Detailed descriptions
Related concepts
Examples
Correlation Detection:
For each pair of generated words, the backend asks Gemini if there's a correlation
If a correlation exists, it creates an edge between the nodes
Response Formatting:
The backend formats the data as nodes and edges for React Flow
Each node contains the word and its associated information
Each edge represents a correlation between words
Frontend Rendering:
React Flow renders the nodes and edges
The graph layout is applied
Users can interact with the visualization
3. User Interaction
When a user clicks on a node:
The onNodeClick handler sets the selected node in state
The DetailPanel component displays the node's detailed information:
Full description
Related topics
Examples
Users can close the panel by clicking the X or clicking elsewhere

Alternative Implementation (backend-2.py)
This file provides an alternative approach for generating DAGs that's not currently being used:
It has a different endpoint (/api/dag/generate)
Uses NetworkX for better graph layouts
Has features for task status management
Provides a more optimized output format for React Flow
File Structure and Responsibilities:
app.py: Main Flask application entry point
word_graph.py: Blueprint for word graph generation
backend.py: Original DAG generation (using Gemini)
backend-2.py: Alternative DAG implementation (not currently used)
WordGraph.tsx: React component for visualization
App.tsx: Main React component that renders WordGraph
This architecture separates concerns nicely:
Frontend handles visualization and user interaction
Backend handles the AI-powered content generation
Data flows through well-defined APIs
