import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';

// Custom node component to display task status
const TaskNode = ({ data }) => {
  const getStatusColor = (status) => {
    switch(status) {
      case 'completed': return 'bg-green-500';
      case 'in-progress': return 'bg-blue-500';
      case 'pending': return 'bg-gray-300';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-300';
    }
  };

  return (
    <div className="px-4 py-2 shadow-md rounded-md border-2 border-gray-200 bg-white w-48">
      <div className="flex flex-col">
        <div className="font-bold text-lg mb-1">{data.label}</div>
        <div className={`text-sm py-1 px-2 rounded ${getStatusColor(data.status)} text-white`}>
          {data.status}
        </div>
      </div>
    </div>
  );
};

const ExecutionDAG = () => {
  // Sample DAG data - replace with your actual data
  const initialNodes = [
    { 
      id: 'task1', 
      data: { label: 'Data Loading', status: 'completed' }, 
      position: { x: 0, y: 0 }, 
      type: 'taskNode',
      sourcePosition: Position.Right,
      targetPosition: Position.Left 
    },
    { 
      id: 'task2', 
      data: { label: 'Data Preprocessing', status: 'completed' }, 
      position: { x: 250, y: 0 },
      type: 'taskNode',
      sourcePosition: Position.Right,
      targetPosition: Position.Left 
    },
    { 
      id: 'task3', 
      data: { label: 'Feature Engineering', status: 'in-progress' }, 
      position: { x: 500, y: 0 },
      type: 'taskNode',
      sourcePosition: Position.Right,
      targetPosition: Position.Left 
    },
    { 
      id: 'task4', 
      data: { label: 'Model Training', status: 'pending' }, 
      position: { x: 750, y: -75 },
      type: 'taskNode',
      sourcePosition: Position.Right,
      targetPosition: Position.Left 
    },
    { 
      id: 'task5', 
      data: { label: 'Model Evaluation', status: 'pending' }, 
      position: { x: 1000, y: -75 },
      type: 'taskNode',
      sourcePosition: Position.Right,
      targetPosition: Position.Left 
    },
    { 
      id: 'task6', 
      data: { label: 'Model Deployment', status: 'pending' }, 
      position: { x: 1250, y: -75 },
      type: 'taskNode',
      sourcePosition: Position.Right,
      targetPosition: Position.Left 
    },
    { 
      id: 'task7', 
      data: { label: 'Post-processing', status: 'pending' }, 
      position: { x: 750, y: 75 },
      type: 'taskNode',
      sourcePosition: Position.Right,
      targetPosition: Position.Left 
    },
  ];

  const initialEdges = [
    { id: 'e1-2', source: 'task1', target: 'task2', animated: false, style: { stroke: '#64748b', strokeWidth: 2 } },
    { id: 'e2-3', source: 'task2', target: 'task3', animated: false, style: { stroke: '#64748b', strokeWidth: 2 } },
    { id: 'e3-4', source: 'task3', target: 'task4', animated: true, style: { stroke: '#3b82f6', strokeWidth: 2 } },
    { id: 'e3-7', source: 'task3', target: 'task7', animated: true, style: { stroke: '#3b82f6', strokeWidth: 2 } },
    { id: 'e4-5', source: 'task4', target: 'task5', animated: false, style: { stroke: '#64748b', strokeWidth: 2 } },
    { id: 'e5-6', source: 'task5', target: 'task6', animated: false, style: { stroke: '#64748b', strokeWidth: 2 } },
  ];

  const getStatusColor = (status) => {
    switch(status) {
      case 'completed': return 'bg-green-500';
      case 'in-progress': return 'bg-blue-500';
      case 'pending': return 'bg-gray-300';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-300';
    }
  };

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Register custom node types
  const nodeTypes = {
    taskNode: TaskNode,
  };

  // Auto-layout using dagre (simulated here - would use dagre or elkjs in a real implementation)
  // In a real implementation, you would use useLayoutedElements from react-flow-renderer example

  // Handle node click
  const onNodeClick = useCallback((event, node) => {
    console.log('clicked node:', node);
    // You can implement selection or showing details here
  }, []);

  return (
    <div className="w-full h-screen">
      <div className="h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-right"
        >
          <Controls />
          <MiniMap 
            nodeStrokeColor={(n) => {
              if (n.data.status === 'completed') return '#22c55e';
              if (n.data.status === 'in-progress') return '#3b82f6';
              if (n.data.status === 'failed') return '#ef4444';
              return '#94a3b8';
            }}
            nodeColor={(n) => {
              if (n.data.status === 'completed') return '#22c55e';
              if (n.data.status === 'in-progress') return '#3b82f6';
              if (n.data.status === 'failed') return '#ef4444';
              return '#94a3b8';
            }}
          />
          <Background color="#aaa" gap={16} />
        </ReactFlow>
      </div>
      
      <div className="absolute bottom-2 left-2 bg-white p-2 rounded shadow-md flex gap-4 z-10">
        <div className="flex items-center">
          <div className="w-4 h-4 bg-green-500 rounded-full mr-2"></div>
          <span>Completed</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-blue-500 rounded-full mr-2"></div>
          <span>In Progress</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-gray-300 rounded-full mr-2"></div>
          <span>Pending</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-red-500 rounded-full mr-2"></div>
          <span>Failed</span>
        </div>
      </div>
    </div>
  );
};

export default ExecutionDAG;

// import React, { useState, useCallback, useEffect } from 'react';
// import ReactFlow, {
//   MiniMap,
//   Controls,
//   Background,
//   useNodesState,
//   useEdgesState,
//   Position,
// } from 'reactflow';
// import 'reactflow/dist/style.css';

// const BACKEND_HOST = "http://localhost:5000"

// // Custom node component to display task status
// const TaskNode = ({ data }) => {

//   // Setup graph:
//   // const getGraph = async () => {
//   //   fetch(`${BACKEND_HOST}/api/generate_graph`, {
//   //     method: "POST",
//   //     headers: {
//   //       "Content-Type": "application/json",
//   //     },
//   //     body: JSON.stringify({
//   //       topic: "topic_test"
//   //     })
//   //   })
//   //   .then(res => res.json())
//   //   .then(data => setData(data));
//   //   // .then(data => console.log(data));
//   // }

  // const getStatusColor = (status) => {
  //   switch(status) {
  //     case 'completed': return 'bg-green-500';
  //     case 'in-progress': return 'bg-blue-500';
  //     case 'pending': return 'bg-gray-300';
  //     case 'failed': return 'bg-red-500';
  //     default: return 'bg-gray-300';
  //   }
  // };

//   const handleStatusUpdate = () => {
//     if (data.onStatusChange) {
//       const newStatus = getNextStatus(data.status);
//       data.onStatusChange(data.id, newStatus);
//     }
//   };

//   const getNextStatus = (currentStatus) => {
//     const statusFlow = {
//       'pending': 'in-progress',
//       'in-progress': 'completed',
//       'completed': 'failed',
//       'failed': 'pending'
//     };
//     return statusFlow[currentStatus] || 'pending';
//   };

//   return (
//     <div className="px-4 py-2 shadow-md rounded-md border-2 border-gray-200 bg-white w-48">
//       <div className="flex flex-col">
//         <div className="font-bold text-lg mb-1">{data.label}</div>
//         <div 
//           className={`text-sm py-1 px-2 rounded ${getStatusColor(data.status)} text-white cursor-pointer`}
//           onClick={handleStatusUpdate}
//         >
//           {data.status}
//         </div>
//       </div>
//     </div>
//   );
// };

// const ExecutionDAG = () => {
//   // React Flow state
//   const [nodes, setNodes, onNodesChange] = useNodesState([]);
//   const [edges, setEdges, onEdgesChange] = useEdgesState([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);
//   const [prompt, setPrompt] = useState('Generate an execution DAG for a machine learning pipeline with data preprocessing, feature engineering, model training, and evaluation');
//   const [isGenerating, setIsGenerating] = useState(false);

//   // Register custom node types
//   const nodeTypes = {
//     taskNode: TaskNode,
//   };

//   // Generate DAG data from the backend using Gemini
//   const generateDagData = useCallback(async () => {
//     try {
//       setIsGenerating(true);
//       setLoading(true);
      
//       const response = await fetch('http://localhost:5000/api/dag/generate', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           prompt: prompt
//         }),
//       });
      
//       if (!response.ok) {
//         throw new Error('Failed to generate DAG data');
//       }
      
//       const data = await response.json();
      
//       if (data.error) {
//         throw new Error(data.message || 'Error generating DAG');
//       }
      
//       // Add the status update handler to each node
//       const nodesWithHandlers = data.nodes.map(node => ({
//         ...node,
//         data: {
//           ...node.data,
//           id: node.id,
//           onStatusChange: handleStatusChange
//         }
//       }));
      
//       setNodes(nodesWithHandlers);
//       setEdges(data.edges);
//       setError(null);
//     } catch (err) {
//       setError(err.message);
//       console.error('Error generating DAG data:', err);
//     } finally {
//       setLoading(false);
//       setIsGenerating(false);
//     }
//   }, [prompt]);

//   // Update node status
//   const handleStatusChange = useCallback(async (taskId, newStatus) => {
//     try {
//       // Send update to backend
//       const response = await fetch('http://localhost:5000/api/dag/status', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           taskId,
//           status: newStatus
//         }),
//       });
      
//       if (!response.ok) {
//         throw new Error('Failed to update task status');
//       }
      
//       // Update the local state
//       setNodes(nds => 
//         nds.map(node => {
//           if (node.id === taskId) {
//             // Update the node status
//             return {
//               ...node,
//               data: {
//                 ...node.data,
//                 status: newStatus
//               }
//             };
//           }
//           return node;
//         })
//       );
      
//       // Update edge animations based on node status
//       setEdges(eds => 
//         eds.map(edge => {
//           const sourceNode = nodes.find(n => n.id === edge.source);
//           const sourceStatus = sourceNode?.data?.status;
          
//           return {
//             ...edge,
//             animated: sourceStatus === 'in-progress',
//             style: {
//               ...edge.style,
//               stroke: sourceStatus === 'in-progress' ? '#3b82f6' : '#64748b'
//             }
//           };
//         })
//       );
      
//     } catch (err) {
//       console.error('Error updating task status:', err);
//     }
//   }, [nodes, setNodes, setEdges]);

//   // Handle prompt change
//   const handlePromptChange = (e) => {
//     setPrompt(e.target.value);
//   };

//   // Handle form submission
//   const handleSubmit = (e) => {
//     e.preventDefault();
//     generateDagData();
//   };

//   // Handle example prompts
//   const examplePrompts = [
//     "Generate an execution DAG for a data engineering pipeline with extraction, transformation, and loading steps",
//     "Create a machine learning workflow DAG with data preprocessing, feature selection, model training, hyperparameter tuning, and evaluation",
//     "Generate a DAG for a web scraping pipeline with URL collection, HTML retrieval, data extraction, and database storage",
//     "Create an AI pipeline DAG for text processing with data collection, preprocessing, embedding generation, model training, and deployment"
//   ];

//   const setExamplePrompt = (example) => {
//     setPrompt(example);
//   };

//   if (loading && isGenerating) {
//     return (
//       <div className="w-full h-screen flex items-center justify-center">
//         <div className="text-lg">Generating DAG with Gemini AI...</div>
//       </div>
//     );
//   }

//   return (
//     <div className="w-full h-screen flex flex-col">
//       {/* Prompt input form */}
//       <div className="p-4 bg-white border-b border-gray-200">
//         <form onSubmit={handleSubmit} className="flex flex-col gap-2">
//           <div className="flex flex-col">
//             <label htmlFor="prompt" className="font-medium mb-1">Describe your execution DAG:</label>
//             <textarea
//               id="prompt"
//               value={prompt}
//               onChange={handlePromptChange}
//               className="border border-gray-300 rounded p-2 min-h-24"
//               placeholder="Describe the execution DAG you want to generate..."
//             />
//           </div>
          
//           <div className="flex gap-2">
//             <button 
//               type="submit"
//               disabled={isGenerating}
//               className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300"
//             >
//               {isGenerating ? 'Generating...' : 'Generate DAG with Gemini'}
//             </button>
//           </div>
          
//           {error && (
//             <div className="text-red-500 mt-2">
//               Error: {error}
//             </div>
//           )}
//         </form>
        
//         <div className="mt-4">
//           <h3 className="font-medium mb-2">Example prompts:</h3>
//           <div className="flex flex-wrap gap-2">
//             {examplePrompts.map((example, index) => (
//               <button
//                 key={index}
//                 onClick={() => setExamplePrompt(example)}
//                 className="px-3 py-1 bg-gray-100 text-sm rounded hover:bg-gray-200 border border-gray-300"
//               >
//                 {example.length > 50 ? example.substring(0, 50) + '...' : example}
//               </button>
//             ))}
//           </div>
//         </div>
//       </div>
      
//       {/* DAG visualization */}
//       <div className="flex-1">
//         {nodes.length > 0 ? (
//           <ReactFlow
//             nodes={nodes}
//             edges={edges}
//             onNodesChange={onNodesChange}
//             onEdgesChange={onEdgesChange}
//             nodeTypes={nodeTypes}
//             fitView
//             attributionPosition="bottom-right"
//           >
//             <Controls />
//             <MiniMap 
//               nodeStrokeColor={(n) => {
//                 if (n.data?.status === 'completed') return '#22c55e';
//                 if (n.data?.status === 'in-progress') return '#3b82f6';
//                 if (n.data?.status === 'failed') return '#ef4444';
//                 return '#94a3b8';
//               }}
//               nodeColor={(n) => {
//                 if (n.data?.status === 'completed') return '#22c55e';
//                 if (n.data?.status === 'in-progress') return '#3b82f6';
//                 if (n.data?.status === 'failed') return '#ef4444';
//                 return '#94a3b8';
//               }}
//             />
//             <Background color="#aaa" gap={16} />
//           </ReactFlow>
//         ) : (
//           <div className="w-full h-full flex items-center justify-center bg-gray-50">
//             <div className="text-lg text-gray-500">
//               Enter a prompt and click "Generate DAG" to create a visualization
//             </div>
//           </div>
//         )}
//       </div>
      
//       {/* Legend */}
//       {nodes.length > 0 && (
//         <div className="absolute bottom-2 left-2 bg-white p-2 rounded shadow-md flex gap-4 z-10">
//           <div className="flex items-center">
//             <div className="w-4 h-4 bg-green-500 rounded-full mr-2"></div>
//             <span>Completed</span>
//           </div>
//           <div className="flex items-center">
//             <div className="w-4 h-4 bg-blue-500 rounded-full mr-2"></div>
//             <span>In Progress</span>
//           </div>
//           <div className="flex items-center">
//             <div className="w-4 h-4 bg-gray-300 rounded-full mr-2"></div>
//             <span>Pending</span>
//           </div>
//           <div className="flex items-center">
//             <div className="w-4 h-4 bg-red-500 rounded-full mr-2"></div>
//             <span>Failed</span>
//           </div>
//         </div>
//       )}
      
//       {/* Instructions */}
//       {nodes.length > 0 && (
//         <div className="absolute bottom-2 right-2 bg-white p-2 rounded shadow-md z-10">
//           <div className="text-sm text-gray-500">Click on a task status to cycle through states</div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default ExecutionDAG;
