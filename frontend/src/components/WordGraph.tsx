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

const BACKEND_HOST = "http://localhost:8000";

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

const WordNode = ({ data }: { data: { label: string} }) => {
    return (
      <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-blue-500">
        <div className="flex flex-col">
          <div className="font-bold">{data.label}</div>
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
  const [edgePath, labelX, labelY] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  const [isHovered, setIsHovered] = useState(false);

  return (
    <>
      <path
        id={id}
        style={style}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
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
              boxShadow: '0 0 10px rgba(14, 13, 13, 0.1)',
              pointerEvents: 'none',
              zIndex: 1000,
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
  const [topic, setTopic] = useState('Technology');

  const nodeTypes = {
    wordNode: WordNode,
  };
  
  const edgeTypes = {
    'relationship': RelationshipEdge,
  };

  const generateGraph = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${BACKEND_HOST}/api/word-graph/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic,
          num_words: 5,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate word graph');
      }

      const data = await response.json();
      
      // Process the edges to add the custom type
      const processedEdges = data.edges.map((edge: Edge) => ({
        ...edge,
        type: 'relationship',
      }));
      
      // Apply a force-directed layout (simulated here with positioning)
      const processedNodes = data.nodes.map((node: Node, index: number) => ({
        ...node,
        position: {
          x: 250 + Math.cos(index * (2 * Math.PI / data.nodes.length)) * 300,
          y: 250 + Math.sin(index * (2 * Math.PI / data.nodes.length)) * 300,
        },
      }));
      
      setNodes(processedNodes);
      setEdges(processedEdges);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateGraph();
  }, []);

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
            Topic
          </label>
          <input
            type="text"
            id="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter a topic"
          />
        </div>
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