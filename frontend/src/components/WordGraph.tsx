import React, { useCallback, useState, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  EdgeLabelRenderer,
  getStraightPath,
  EdgeProps,
} from 'reactflow';
import { MarkerType } from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';

const BACKEND_HOST = "http://localhost:8000";
// const BACKEND_HOST = process.env.BACKEND_HOST || "http://localhost:8000";

// Color palette
const COLORS = {
  primary: '#94c5cc', // Light blue
  secondary: '#f5f0e1', // Beige
  accent: '#7a9e9f', // Muted teal
  text: '#4a4a4a', // Dark gray
  lightText: '#8a8a8a', // Medium gray
  border: '#e0d8c0', // Light beige
  highlight: '#a7c4bc', // Sage green
  background: '#faf7f0', // Off-white
  shadow: 'rgba(0, 0, 0, 0.05)', // Subtle shadow
  cardShadow: '0 8px 20px rgba(0, 0, 0, 0.06)',
  nodeGlow: 'rgba(167, 196, 188, 0.4)',
};

// Helper function to estimate text width
const estimateTextWidth = (text: string, fontSize = 16, fontWeight = 500): number => {
  // A rough estimate: average char is ~0.6em wide, for a medium weight font
  // Use multipliers for different characters
  const charWidths: {[key: string]: number} = {
    'i': 0.3, 'l': 0.3, 'I': 0.3, 'j': 0.35, 'f': 0.35, 't': 0.4, 'r': 0.4,
    'm': 1.0, 'w': 1.0, 'M': 1.1, 'W': 1.1,
  };
  
  // Calculate the width
  let width = 0;
  for (const char of text) {
    width += (charWidths[char] || 0.6);
  }
  
  // Convert em to pixels based on font size and add padding
  return width * fontSize + 60; // Add fixed padding for node
};

// Helper function to create a dagre graph and position nodes
const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'LR') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  // Set direction for layout algorithm
  // LR = left to right, TB = top to bottom
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ 
    rankdir: direction, 
    nodesep: 120, 
    ranksep: 500,  // Increase space between ranks to allow room for arrows
    edgesep: 80,   // Give edges more space 
  }); 
  
  // Add nodes to dagre graph with their dimensions
  nodes.forEach((node) => {
    // Calculate width based on the term length
    const label = node.data?.label || '';
    const width = Math.max(estimateTextWidth(label), 150); // Minimum width of 150px
    const height = 80; // Keep height fixed
    
    dagreGraph.setNode(node.id, { width, height });
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
    const width = nodeWithPosition.width;
    
    return {
      ...node,
      type: "WordNode",
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      position: {
        x: nodeWithPosition.x - width/2, // Center based on actual width
        y: nodeWithPosition.y - 40,
      },
      width: width, // Store width for the node component
    };
  });

  return { layoutedNodes, layoutedEdges: edges };
};

// Custom node component
// const ExpandedNode = ({ data }: { data: { label: string; summary: string; description: string; relatedTopics: string[]; examples: string[] } }) => {
//   return (
//     <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-blue-500">
//       <div className="flex flex-col">
//         <div className="font-bold">{data.label}</div>
//         <div className="text-sm text-gray-500">{data.summary}</div>
//         <div className="text-sm text-gray-500">{data.description}</div>
//         <div className="text-sm text-gray-500">{data.relatedTopics.join(', ')}</div>
//         <div className="text-sm text-gray-500">{data.examples.join(', ')}</div>
//       </div>
//     </div>
//   );
// };

// Custom node component with clickable styling
const WordNode = ({ data, selected }: { data: { label: string; summary: string }; selected: boolean }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div 
      className="px-6 py-4 rounded-lg shadow-md transition-all duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: selected ? COLORS.accent : isHovered ? COLORS.highlight : COLORS.secondary,
        borderLeft: `5px solid ${selected ? '#6c8a8b' : isHovered ? COLORS.accent : COLORS.primary}`,
        color: COLORS.text,
        transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: isHovered 
          ? `0 12px 24px ${COLORS.shadow}, 0 0 15px ${COLORS.nodeGlow}` 
          : `0 6px 12px ${COLORS.shadow}`,
        width: 'auto', // Let width be determined by content
        minWidth: '150px', 
        backdropFilter: 'blur(8px)',
        zIndex: 0, // Ensure edges can render on top
      }}
    >

      {/* Add Handle components */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-green-500"
      />
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-blue-500"
      />

      <div className="flex flex-col">
        <div className="font-medium text-base tracking-wide" style={{ color: selected ? '#fff' : COLORS.text }}>
          {data.label}
        </div>
        <div 
          className={`text-xs mt-2 leading-relaxed transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`} 
          style={{ 
            color: selected ? '#f0f0f0' : COLORS.lightText,
            height: isHovered ? 'auto' : '0',
            overflow: 'hidden'
          }}
        >
          {data.summary?.substring(0, 75)}...
        </div>
      </div>
    </div>
  );
};

// Custom edge component with hover tooltip
const RelationshipEdge = ({ 
  id, 
  // Below we ignore the linter which used to complain that we didn't use these fields, but we need to specify for them for interface
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  source,
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
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
          stroke: COLORS.accent,
          strokeWidth: isHovered ? 4 : 2.5,
          strokeDasharray: isHovered ? "none" : "8,4",
          transition: 'all 0.3s ease',
          cursor: 'pointer',
          opacity: isHovered ? 1 : 0.85,
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
              background: 'rgba(245, 240, 225, 0.95)',
              color: COLORS.text,
              padding: '10px 16px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '500',
              letterSpacing: '0.2px',
              boxShadow: COLORS.cardShadow,
              pointerEvents: 'none',
              zIndex: 1000,
              border: `1px solid ${COLORS.border}`,
              maxWidth: '220px',
              backdropFilter: 'blur(4px)',
              animation: 'fadeIn 0.2s ease-out',
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
    <div 
      className="absolute right-6 top-6 w-96 rounded-lg p-7 border transition-all duration-300" 
      style={{ 
        background: 'rgba(245, 240, 225, 0.95)',
        borderColor: COLORS.border,
        color: COLORS.text,
        boxShadow: COLORS.cardShadow,
        backdropFilter: 'blur(10px)',
        animation: 'slideIn 0.3s ease-out',
      }}
    >
      <div className="flex justify-between items-start mb-5">
        <h2 className="text-xl font-bold tracking-tight" style={{ color: COLORS.accent }}>{node.data.label}</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 rounded-full h-8 w-8 flex items-center justify-center transition-colors duration-200"
          style={{ background: COLORS.background }}
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-6">
        <div>
          <h3 className="font-semibold mb-3 flex items-center" style={{ color: COLORS.accent }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Description
          </h3>
          <p className="text-sm leading-relaxed" style={{ lineHeight: '1.6' }}>{node.data.description}</p>
        </div>
        
        <div>
          <h3 className="font-semibold mb-3 flex items-center" style={{ color: COLORS.accent }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
            </svg>
            Related Topics
          </h3>
          <div className="flex flex-wrap gap-2">
            {node.data.relatedTopics.map((topic: string, index: number) => (
              <span
                key={index}
                className="px-3 py-1 rounded-full text-xs transition-transform duration-200 hover:scale-105"
                style={{ 
                  background: COLORS.primary, 
                  color: COLORS.text,
                }}
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
        
        <div>
          <h3 className="font-semibold mb-3 flex items-center" style={{ color: COLORS.accent }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Examples
          </h3>
          <ul className="list-none text-sm space-y-2">
            {node.data.examples.map((example: string, index: number) => (
              <li key={index} className="leading-relaxed flex items-start">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full mr-2 flex-shrink-0 text-xs" style={{ 
                  background: COLORS.highlight, 
                  color: COLORS.text,
                  textAlign: 'center',
                }}>
                  {index + 1}
                </span>
                <span>{example}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

const nodeTypes = {
  WordNode: WordNode,
};

const edgeTypes = {
  'relationship': RelationshipEdge,
};

const WordGraph = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topic, setTopic] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

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
      
      // Debug the edges data coming from backend
      console.log("Received edges from backend:", data.edges);
      
      // Process the edges to add the custom type
      const processedEdges = data.edges.map((edge: Edge) => ({
        ...edge,
        //type: 'relationship', // Always use our custom relationship type
        // Remove any existing type property that might conflict
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 14,
          height: 14, 
          color: COLORS.accent,
        },
        style: {
          strokeWidth: 5, 
          stroke: COLORS.accent,
          opacity: 0.85,
          strokeDasharray: '8,8',
        },
        // Adjust how edges connect to nodes
        targetHandle: 'target',
        sourceHandle: 'source',
        // Ensure there's space at the end for the arrow
        targetDistance: 10,
      }));
      
      console.log("Processed edges:", processedEdges);
      
      // Apply dagre layout instead of circular layout
      const result = getLayoutedElements(
        data.nodes,
        processedEdges,
        'LR' // Left to right direction
      );
      
      console.log("Final edges after layout:", result.layoutedEdges);
      
      setNodes(result.layoutedNodes);
      setEdges(result.layoutedEdges);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onBackgroundClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  return (
    <div className="w-full h-screen relative font-sans" style={{ background: COLORS.background }}>
      {/* Global CSS for animations - using style tag without jsx/global attributes */}
      <style>
        {`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(122, 158, 159, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(122, 158, 159, 0); }
          100% { box-shadow: 0 0 0 0 rgba(122, 158, 159, 0); }
        }
        
        .pulse {
          animation: pulse 2s infinite;
        }
        `}
      </style>

      {/* Topic Input Panel */}
      <div 
        className="absolute top-6 left-6 z-50 p-8 rounded-xl shadow-md" 
        style={{ 
          background: 'rgba(245, 240, 225, 0.95)',
          borderLeft: `4px solid ${COLORS.accent}`,
          maxWidth: '360px',
          boxShadow: COLORS.cardShadow,
          backdropFilter: 'blur(10px)',
        }}
      >
        <div className="mb-6">
          <h3 className="text-xl font-bold mb-6 text-center tracking-tight" style={{ color: COLORS.accent }}>learning journey</h3>
          
          <div className="space-y-5">
            <div>
              <label htmlFor="topic" className="block text-sm mb-2 font-medium" style={{ color: COLORS.text }}>
                Topic {uploadedFile && <span className="text-xs opacity-70 ml-1">(optional with attachment)</span>}
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 transition-all duration-300"
                  style={{ 
                    border: `1px solid ${COLORS.border}`,
                    background: COLORS.background,
                    color: COLORS.text,
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)',
                  }}
                  placeholder={uploadedFile ? "Optional with attachment" : "Enter a topic"}
                />
                {topic && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute right-3 top-1/2 transform -translate-y-1/2" 
                    style={{ color: COLORS.accent }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                )}
              </div>
            </div>
        
            {/* Upload Attachment Button */}
            <div>
              <label 
                htmlFor="file-upload" 
                className="w-full flex items-center justify-center px-4 py-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-opacity-90"
                style={{
                  background: COLORS.background,
                  color: COLORS.text,
                  border: `1px solid ${COLORS.border}`,
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke={COLORS.accent}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
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
          </div>
        </div>
        
        {/* Display uploaded file */}
        {uploadedFile && (
          <div className="mb-6">
            <div 
              className="rounded-lg p-3 flex items-center justify-between"
              style={{ background: COLORS.background }}
            >
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke={COLORS.accent}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm truncate max-w-[200px]" style={{ color: COLORS.text }}>{uploadedFile.name}</span>
              </div>
              <button 
                onClick={handleFileDelete}
                className="text-red-400 hover:text-red-600 rounded-full h-6 w-6 flex items-center justify-center transition-colors duration-200"
                style={{ background: 'rgba(255,255,255,0.5)' }}
                aria-label="Remove file"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
        
        <button
          onClick={generateGraph}
          disabled={loading}
          className={`w-full px-4 py-3 rounded-lg font-medium transition-all duration-300 ${!topic && !uploadedFile ? 'opacity-70' : 'pulse'}`}
          style={{
            background: loading ? `${COLORS.accent}90` : COLORS.accent,
            color: '#fff',
            boxShadow: '0 2px 10px rgba(122, 158, 159, 0.2)',
          }}
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating your journey...
            </div>
          ) : 'Generate Knowledge Map'}
        </button>
        {error && (
          <div className="mt-4 text-red-500 text-sm bg-red-50 p-3 rounded-lg border border-red-100">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error}
            </div>
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
          fitViewOptions={{ padding: 0.3 }}
          attributionPosition="bottom-right"
        >
          <Controls 
            style={{ 
              backgroundColor: COLORS.secondary,
              borderRadius: '10px',
              border: `1px solid ${COLORS.border}`,
            }} 
          />
          <MiniMap 
            nodeStrokeColor={COLORS.accent}
            nodeColor={COLORS.primary}
            maskColor={`${COLORS.background}80`}
            style={{
              borderRadius: '8px',
              border: `1px solid ${COLORS.border}`,
            }}
          />
          <Background color={COLORS.border} gap={20} size={1} />
        </ReactFlow>
      </div>
      
      <DetailPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
      
      <div 
        className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-10 px-5 py-3 rounded-xl shadow-md" 
        style={{ 
          background: 'rgba(245, 240, 225, 0.95)',
          borderLeft: `3px solid ${COLORS.primary}`,
          maxWidth: '380px',
          backdropFilter: 'blur(10px)',
          boxShadow: COLORS.cardShadow,
        }}
      >
        <div className="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-3 flex-shrink-0" style={{ color: COLORS.accent }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p style={{ color: COLORS.text, fontSize: '13px', fontWeight: 500 }}>
            Click on a node to explore details
            <span className="inline-block ml-2 text-xs opacity-70">(hover for relationships)</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default WordGraph; 