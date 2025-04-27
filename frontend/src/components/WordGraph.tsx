import React, { useCallback, useState, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  Position,
  EdgeLabelRenderer,
  getStraightPath,
  EdgeProps,
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';

const BACKEND_HOST = "http://localhost:8000";

// Helper function to create a dagre graph and position nodes
const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'LR') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  // Set direction for layout algorithm
  // LR = left to right, TB = top to bottom
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction });

  // Add nodes to dagre graph with their dimensions
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 172, height: 36 });
  });

  // Add edges to dagre graph
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Calculate layout
  dagre.layout(dagreGraph);

  // Get positions for nodes
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    
    return {
      ...node,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      position: {
        x: nodeWithPosition.x - 86,
        y: nodeWithPosition.y - 18,
      },
    };
  });

  return { layoutedNodes, layoutedEdges: edges };
};

// Custom node component
const ExpandedNode = ({ data }: { data: { label: string; summary: string; description: string; relatedTopics: string[]; examples: string[] } }) => {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-blue-500">
      <div className="flex flex-col">
        <div className="font-bold">{data.label}</div>
        <div className="text-sm text-gray-500">{data.summary}</div>
        <div className="text-sm text-gray-500">{data.description}</div>
        <div className="text-sm text-gray-500">{data.relatedTopics.join(', ')}</div>
        <div className="text-sm text-gray-500">{data.examples.join(', ')}</div>
      </div>
    </div>
  );
};

// Custom node component with clickable styling
const WordNode = ({ data, selected }: { data: { label: string; summary: string }; selected: boolean }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div 
      className={`px-4 py-2 shadow-md rounded-md bg-white border-2 ${selected ? 'border-red-500' : isHovered ? 'border-green-500' : 'border-blue-500'} cursor-pointer hover:bg-blue-50 transition-colors`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        transform: isHovered ? 'scale(1.05)' : 'scale(1)',
        transition: 'transform 0.2s ease-in-out',
        boxShadow: isHovered ? '0 4px 12px rgba(0, 0, 0, 0.15)' : '0 2px 6px rgba(0, 0, 0, 0.1)',
      }}
    >
      <div className="flex flex-col">
        <div className="font-bold">{data.label}</div>
        {isHovered && (
          <div className="text-xs text-gray-500 mt-1">{data.summary?.substring(0, 60)}...</div>
        )}
      </div>
    </div>
  );
};

// Custom edge component with hover tooltip
const RelationshipEdge = ({ 
  id, 
  source, 
  target, 
  sourceX, 
  sourceY, 
  targetX, 
  targetY, 
  style = {}, 
  data,
  markerEnd,
}: EdgeProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const edgeRef = React.useRef<SVGPathElement>(null);

  const [edgePath, labelX, labelY] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  // Add mouseenter/mouseleave listeners with a small delay
  useEffect(() => {
    const handleMouseEnter = () => setIsHovered(true);
    const handleMouseLeave = () => setIsHovered(false);
    
    const currentEdge = edgeRef.current;
    if (currentEdge) {
      currentEdge.addEventListener('mouseenter', handleMouseEnter);
      currentEdge.addEventListener('mouseleave', handleMouseLeave);
    }
    
    return () => {
      if (currentEdge) {
        currentEdge.removeEventListener('mouseenter', handleMouseEnter);
        currentEdge.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, []);

  return (
    <>
      <path
        ref={edgeRef}
        id={id}
        style={{
          ...style, 
          strokeWidth: 5,
          cursor: 'pointer',
        }}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />
      {isHovered && data?.explanation && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              background: 'white',
              padding: '6px 10px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 'bold',
              boxShadow: '0 0 10px rgba(0, 0, 0, 0.3)',
              pointerEvents: 'none',
              zIndex: 1000,
              border: '1px solid #3b82f6',
            }}
            className="nodrag nopan"
          >
            {data.explanation}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

// Detailed view panel component
const DetailPanel = ({ node, onClose }: { node: Node | null; onClose: () => void }) => {
  if (!node) return null;

  return (
    <div className="absolute right-4 top-4 w-80 bg-white rounded-lg shadow-lg p-4 border border-gray-200">
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-xl font-bold text-gray-800">{node.data.label}</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-gray-700 mb-1">Description</h3>
          <p className="text-gray-600 text-sm">{node.data.description}</p>
        </div>
        
        <div>
          <h3 className="font-semibold text-gray-700 mb-1">Related Topics</h3>
          <div className="flex flex-wrap gap-2">
            {node.data.relatedTopics.map((topic: string, index: number) => (
              <span
                key={index}
                className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
        
        <div>
          <h3 className="font-semibold text-gray-700 mb-1">Examples</h3>
          <ul className="list-disc list-inside text-gray-600 text-sm">
            {node.data.examples.map((example: string, index: number) => (
              <li key={index}>{example}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

const WordGraph = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topic, setTopic] = useState('Dynamic Programming Problem');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const nodeTypes = {
    WordNode: WordNode,
  };
  
  const edgeTypes = {
    'relationship': RelationshipEdge,
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadedFile(e.target.files[0]);
    }
  };

  const handleFileDelete = () => {
    setUploadedFile(null);
    // Reset the file input
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const generateGraph = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let response;

      if (uploadedFile) {
        // Create a FormData object for file upload
        const formData = new FormData();
        formData.append('file', uploadedFile);
        if (topic) {
          formData.append('topic', topic);
        }

        // Send file to the file upload endpoint
        response = await fetch(`${BACKEND_HOST}/api/word-graph/upload`, {
          method: 'POST',
          body: formData,
        });
      } else {
        // Text-based topic query
        response = await fetch(`${BACKEND_HOST}/api/word-graph/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            topic,
            num_words: 5,
          }),
        });
      }

      if (!response.ok) {
        throw new Error('Failed to generate word graph');
      }

      const data = await response.json();
      
      // Process the edges to add the custom type
      const processedEdges = data.edges.map((edge: Edge) => ({
        ...edge,
        type: 'relationship',
      }));
      
      // Apply dagre layout instead of circular layout
      const result = getLayoutedElements(
        data.nodes,
        processedEdges,
        'LR' // Left to right direction
      );
      
      setNodes(result.layoutedNodes);
      setEdges(result.layoutedEdges);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onBackgroundClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  return (
    <div className="w-full h-screen relative">
      {/* Topic Input Panel - With higher z-index and more noticeable styling */}
      <div className="absolute top-4 left-4 z-50 bg-white p-4 rounded-lg shadow-xl border-2 border-blue-300">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-gray-800 mb-2">Generate Word Graph</h3>
          <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mb-1">
            Topic {uploadedFile && <span className="text-gray-500 text-xs">(optional with attachment)</span>}
          </label>
          <input
            type="text"
            id="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder={uploadedFile ? "Optional with attachment" : "Enter a topic"}
          />
        </div>
        
        {/* Upload Attachment Button */}
        <div className="mb-4">
          <label htmlFor="file-upload" className="w-full flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 border border-gray-300 cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            Upload Attachment
          </label>
          <input 
            id="file-upload" 
            type="file" 
            className="hidden" 
            accept=".pdf,image/*"
            onChange={handleFileUpload}
          />
        </div>
        
        {/* Display uploaded file */}
        {uploadedFile && (
          <div className="mb-4">
            <div className="bg-gray-100 rounded-md p-2 flex items-center justify-between">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm text-gray-700 truncate max-w-[200px]">{uploadedFile.name}</span>
              </div>
              <button 
                onClick={handleFileDelete}
                className="text-red-500 hover:text-red-700"
                aria-label="Remove file"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
        
        <button
          onClick={generateGraph}
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300 font-medium"
        >
          {loading ? 'Generating...' : 'Generate Graph'}
        </button>
        {error && (
          <div className="mt-2 text-red-500 text-sm">
            {error}
          </div>
        )}
      </div>

      <div className="h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onPaneClick={onBackgroundClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          attributionPosition="bottom-right"
        >
          <Controls />
          <MiniMap 
            nodeStrokeColor="#3b82f6"
            nodeColor="#3b82f6"
          />
          <Background color="#aaa" gap={16} />
        </ReactFlow>
      </div>
      
      <DetailPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
      
      <div className="absolute bottom-4 left-4 z-10 bg-white p-3 rounded-lg shadow-lg text-sm">
        <p className="text-gray-600">
          <strong>Hover over connections</strong> to see relationships between concepts.
        </p>
      </div>
    </div>
  );
};

export default WordGraph; 