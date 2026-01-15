export const rawData: any = {
    'Web Engineering': {    
        'Frontend Frameworks': [
            { title: 'React Server Components', desc: 'Architecture for server-first rendering.', content: 'React Server Components (RSC) represent a paradigm shift in how we build React applications. By allowing components to render exclusively on the server, we can reduce the bundle size sent to the client and access server-side resources directly.\n\nKey Benefits:\n- Zero Bundle Size: Server components do not add to the JavaScript bundle.\n- Direct Database Access: Fetch data directly within the component without API layers.\n- Automatic Code Splitting: Client components imported by server components are automatically code-split.\n\nThis architecture blurs the line between backend and frontend, enabling a more unified development experience.', image: 'https://picsum.photos/seed/react/800/600' },
            { title: 'Vue 3 Composition API', desc: 'Functional setup for state logic.', content: 'The Composition API is a set of additive, function-based APIs that allow for the flexible composition of component logic. It serves as an alternative to the Options API.\n\nWhy use it?\n- Better Logic Reuse: Extract and reuse stateful logic easily.\n- More Flexible Code Organization: Keep related code together instead of splitting it by option types.\n- Better Type Inference: Written with TypeScript in mind from the ground up.', image: 'https://picsum.photos/seed/vue/800/600' },
            { title: 'Svelte 5 Runes', desc: 'Fine-grained reactivity system.', content: 'Svelte 5 introduces "Runes", a new way to declare reactivity that is more explicit and powerful than the previous compiler-magic approach. \n\n$state: Declares reactive state.\n$derived: Declares a value that depends on other state.\n$effect: Runs code when dependencies change.\n\nThis makes Svelte explicit, predictable, and even more performant.', image: 'https://picsum.photos/seed/svelte/800/600' },
            { title: 'HTMX Integration', desc: 'HTML-driven modern interactions.', content: 'HTMX allows you to access AJAX, CSS Transitions, WebSockets and Server Sent Events directly in HTML, using attributes. \n\nIt restores the power of hypermedia to the web, allowing you to build modern user interfaces with the simplicity of classic web development. By returning HTML fragments from the server instead of JSON, you reduce client-side complexity drastically.', image: 'https://picsum.photos/seed/htmx/800/600' }
        ],
        'Backend Systems': [
            { title: 'Node.js Event Loop', desc: 'Phases and microtasks explained.', content: 'The Node.js Event Loop is what allows Node.js to perform non-blocking I/O operations despite being single-threaded. \n\nPhases:\n1. Timers: executes callbacks scheduled by setTimeout() and setInterval().\n2. Pending Callbacks: executes I/O callbacks deferred to the next loop iteration.\n3. Idle, Prepare: internal use only.\n4. Poll: retrieve new I/O events.\n5. Check: setImmediate() callbacks are invoked here.\n6. Close Callbacks: socket.on("close", ...)', image: 'https://picsum.photos/seed/node/800/600' },
            { title: 'Golang Concurrency', desc: 'Goroutines and channels.', content: 'Go concurrency is built on the CSP (Communicating Sequential Processes) model. \n\nGoroutines are lightweight threads managed by the Go runtime. You can spawn thousands of them without significant overhead. Channels are the pipes that connect concurrent goroutines, allowing them to send values to one another and synchronize execution.', image: 'https://picsum.photos/seed/golang/800/600' },
            { title: 'Rust Ownership', desc: 'Memory safety without GC.', content: 'Ownership is Rust\'s most unique feature. It enables memory safety guarantees without needing a garbage collector.\n\nRules:\n- Each value in Rust has a variable that\'s called its owner.\n- There can only be one owner at a time.\n- When the owner goes out of scope, the value will be dropped.\n\nThis system prevents data races and dangling pointers at compile time.', image: 'https://picsum.photos/seed/rust/800/600' }
        ],
        'Styling & UI': [
            { title: 'Tailwind V4', desc: 'Zero-runtime CSS engine.', content: 'Tailwind CSS v4 is a ground-up rewrite of the framework, focused on performance and simplicity. It features a new high-performance engine that is significantly faster than previous versions.\n\nKey features include automatic content detection, built-in CSS variable support for theme values, and zero-configuration setup for most modern build tools.', image: 'https://picsum.photos/seed/tailwind/800/600' },
            { title: 'CSS Grid Layouts', desc: 'Two-dimensional layout system.', content: 'CSS Grid Layout is the most powerful layout system available in CSS. It is a 2-dimensional system, meaning it can handle both columns and rows, unlike Flexbox which is largely a 1-dimensional system.\n\nYou apply CSS Grid to a parent container, and then place its child elements into the grid you have defined.', image: 'https://picsum.photos/seed/cssgrid/800/600' }
        ],
        'DevOps & CI/CD': [
            { title: 'Docker Containers', desc: 'OS-level virtualization.', content: 'Docker packages software into standardized units called containers that have everything the software needs to run including libraries, system tools, code, and runtime. \n\nContainers are lightweight and contain everything needed to run the application, so you do not need to rely on what is installed on the host.', image: 'https://picsum.photos/seed/docker/800/600' },
            { title: 'GitHub Actions', desc: 'Automated software workflows.', content: 'GitHub Actions makes it easy to automate all your software workflows, now with world-class CI/CD. Build, test, and deploy your code right from GitHub. Make code reviews, branch management, and issue triaging work the way you want.', image: 'https://picsum.photos/seed/github/800/600' }
        ]
    },
    'Computer Science': {
        'Data Structures': [
            { title: 'Red-Black Trees', desc: 'Self-balancing BST.', content: 'A Red-Black tree is a kind of self-balancing binary search tree. Each node has an extra bit, and that bit is often interpreted as the color (red or black). These colors are used to ensure that the tree remains approximately balanced during insertions and deletions.\n\nProperties:\n1. Every node is either red or black.\n2. The root is black.\n3. Every leaf (NIL) is black.\n4. If a node is red, then both its children are black.\n5. For each node, all simple paths from the node to descendant leaves contain the same number of black nodes.', image: 'https://picsum.photos/seed/rbtree/800/600' },
            { title: 'Graph Adjacency', desc: 'Matrix vs List.', content: 'Graphs can be represented in computer memory in two main ways:\n\nAdjacency Matrix: A 2D array of size V x V where V is the number of vertices. If adj[i][j] = 1, there is an edge from i to j. Good for dense graphs.\n\nAdjacency List: An array of lists. The array has V elements, and the i-th element is a list of vertices adjacent to vertex i. Good for sparse graphs and saves space.', image: 'https://picsum.photos/seed/graph/800/600' },
            { title: 'Heaps & PriorityQ', desc: 'Binary heap impl.', content: 'A Heap is a special Tree-based data structure in which the tree is a complete binary tree. \n\nMax-Heap: The key present at the root node must be greatest among the keys present at all of its children. The same property must be recursively true for all sub-trees.\nMin-Heap: The key at the root is the minimum.\n\nHeaps are the underlying data structure for Priority Queues.', image: 'https://picsum.photos/seed/heap/800/600' }
        ],
        'Algorithms': [
            { title: 'Dynamic Programming', desc: 'Overlapping subproblems.', content: 'Dynamic Programming is mainly an optimization over plain recursion. Wherever we see a recursive solution that has repeated calls for same inputs, we can optimize it using Dynamic Programming.\n\nThe idea is to simply store the results of subproblems, so that we do not have to re-compute them when needed later. This simple optimization reduces time complexities from exponential to polynomial.', image: 'https://picsum.photos/seed/dp/800/600' },
            { title: 'Dijkstra Pathfinding', desc: 'Shortest path.', content: 'Dijkstra\'s algorithm is an algorithm for finding the shortest paths between nodes in a graph. \n\nIt works by keeping track of the currently known shortest distance from the start node to the destination node and iteratively updates this distance if a shorter path is found. It uses a priority queue to greedily select the closest unvisited node.', image: 'https://picsum.photos/seed/dijkstra/800/600' }
        ]
    },
    'AI & Machine Learning': {
        'LLMs & GenAI': [
            { title: 'Transformer Arch', desc: 'Self-attention mechanism.', content: 'The Transformer is a deep learning architecture introduced in the paper "Attention Is All You Need". It relies entirely on the self-attention mechanism to compute representations of its input and output without using sequence-aligned RNNs or convolution.\n\nKey Components:\n- Multi-Head Attention\n- Positional Encodings\n- Feed-Forward Networks\n- Layer Normalization', image: 'https://picsum.photos/seed/transformer/800/600' },
            { title: 'RAG Pipelines', desc: 'Retrieval Augmented Generation.', content: 'Retrieval-Augmented Generation (RAG) is the process of optimizing the output of a large language model, so it references an authoritative knowledge base outside its training data sources before generating a response.\n\nIt bridges the gap between the frozen knowledge of an LLM and the dynamic, proprietary data of an organization.', image: 'https://picsum.photos/seed/rag/800/600' }
        ],
        'Computer Vision': [
            { title: 'CNN Layers', desc: 'Convolution and pooling.', content: 'Convolutional Neural Networks (CNNs) are specialized neural networks for processing data that has a known grid-like topology, such as time-series data (1D) and image data (2D).\n\nLayers:\n- Convolutional Layer: Applies filters to the input to create feature maps.\n- Pooling Layer: Reduces the spatial size of the representation to reduce parameters and computation.\n- Fully Connected Layer: Performs the classification based on the features.', image: 'https://picsum.photos/seed/cnn/800/600' },
            { title: 'YOLO Detection', desc: 'Real-time object detection.', content: 'YOLO (You Only Look Once) is a popular object detection algorithm known for its speed and accuracy. \n\nUnlike prior detection systems that repurpose classifiers or localizers to perform detection, YOLO applies a single neural network to the full image. This network divides the image into regions and predicts bounding boxes and probabilities for each region.', image: 'https://picsum.photos/seed/yolo/800/600' }
        ]
    },
    'System Architecture': {
        'Distributed Systems': [
            { title: 'CAP Theorem', desc: 'Consistency trade-offs.', content: 'The CAP Theorem states that a distributed data store can effectively provide only two of the following three guarantees:\n\n1. Consistency: Every read receives the most recent write or an error.\n2. Availability: Every request receives a (non-error) response, without the guarantee that it contains the most recent write.\n3. Partition Tolerance: The system continues to operate despite an arbitrary number of messages being dropped or delayed by the network.', image: 'https://picsum.photos/seed/cap/800/600' }
        ],
        'Database Design': [
            { title: 'Sharding Patterns', desc: 'Horizontal scaling.', content: 'Sharding is a method of splitting and storing a single logical dataset in multiple databases. By distributing the data among multiple machines, a cluster of database systems can store larger datasets and handle additional requests.\n\nCommon strategies include:\n- Key Based Sharding\n- Range Based Sharding\n- Directory Based Sharding', image: 'https://picsum.photos/seed/sharding/800/600' }
        ]
    },
    'Security': {
        'Web Security': [
            { title: 'OAuth 2.0 Flows', desc: 'Authorization framework.', content: 'OAuth 2.0 is the industry-standard protocol for authorization. It focuses on client developer simplicity while providing specific authorization flows for web applications, desktop applications, mobile phones, and living room devices.\n\nCommon Grant Types:\n- Authorization Code\n- Implicit\n- Resource Owner Password Credentials\n- Client Credentials', image: 'https://picsum.photos/seed/oauth/800/600' },
            { title: 'XSS Prevention', desc: 'Sanitizing input/output.', content: 'Cross-Site Scripting (XSS) attacks are a type of injection, in which malicious scripts are injected into otherwise benign and trusted websites. \n\nPrevention:\n- Escaping data on output.\n- Validating input on arrival.\n- Using Content Security Policy (CSP).', image: 'https://picsum.photos/seed/xss/800/600' }
        ],
        'Cryptography': [
            { title: 'Public Key Infra', desc: 'Asymmetric encryption.', content: 'Public Key Infrastructure (PKI) is a set of roles, policies, hardware, software and procedures needed to create, manage, distribute, use, store and revoke digital certificates and manage public-key encryption.\n\nIt allows for the secure transfer of information across networks.', image: 'https://picsum.photos/seed/pki/800/600' },
            { title: 'Hashing Algos', desc: 'SHA-256 and salt.', content: 'Cryptographic hash functions are mathematical operations run on digital data. They compare the computed "hash" (the output from execution of the algorithm) to a known and expected hash value to determine the data\'s integrity.\n\nImportant properties: deterministic, quick to compute, pre-image resistance, and collision resistance.', image: 'https://picsum.photos/seed/hash/800/600' }
        ]
    },
    'Mobile Dev': {
        'React Native': [
            { title: 'The Bridge', desc: 'JS and Native comms.', content: 'The "Bridge" in React Native is the mechanism that allows the JavaScript code to communicate with the native platform code (Java/Kotlin for Android, Obj-C/Swift for iOS). All data passed over the bridge must be serialized into JSON.\n\nNewer architectures like JSI (JavaScript Interface) are replacing the bridge to allow for synchronous communication.', image: 'https://picsum.photos/seed/rnbridge/800/600' },
            { title: 'Expo Framework', desc: 'Managed RN workflow.', content: 'Expo is a framework and a platform for universal React applications. It is a set of tools and services built around React Native and native platforms that help you develop, build, deploy, and iterate on iOS, Android, and web apps from the same JavaScript/TypeScript codebase.', image: 'https://picsum.photos/seed/expo/800/600' }
        ],
        'SwiftUI': [
            { title: 'State Management', desc: '@State and @Binding.', content: 'SwiftUI offers a declarative approach to UI development on Apple platforms. \n\n- @State: A property wrapper type that can read and write a value managed by SwiftUI.\n- @Binding: A connection between a property that stores data and a view that displays and changes the data.\n- @EnvironmentObject: A dynamic view property that allows data to be shared across the entire view hierarchy.', image: 'https://picsum.photos/seed/swiftui/800/600' }
        ]
    },
    'Productivity': {
        'Mental Models': [
            { title: 'First Principles', desc: 'Boiling things down.', content: 'First principles thinking is a fancy way of saying "think like a scientist". It is a problem-solving method that involves breaking a problem down into its fundamental truths (the "first principles") and then reasoning up from there, rather than reasoning by analogy (doing what others do).', image: 'https://picsum.photos/seed/principles/800/600' },
            { title: 'Pareto Principle', desc: 'The 80/20 rule.', content: 'The Pareto Principle specifies that 80% of consequences come from 20% of the causes, asserting an unequal relationship between inputs and outputs. In productivity, this means identifying the 20% of tasks that yield 80% of the results and focusing on them.', image: 'https://picsum.photos/seed/pareto/800/600' }
        ],
        'Habits': [
            { title: 'Atomic Habits', desc: '1% better every day.', content: 'Based on James Clear\'s book, the idea is that massive success doesn\'t require massive action. Improving by just 1% every day results in a 37x improvement over the course of a year.\n\nCore laws:\n1. Make it obvious.\n2. Make it attractive.\n3. Make it easy.\n4. Make it satisfying.', image: 'https://picsum.photos/seed/habits/800/600' }
        ]
    }
};

export let allItems: any[] = [];
let idCounter = 100;
export const treeData = Object.keys(rawData).map(cat => ({
    name: cat,
    children: Object.keys(rawData[cat]).map(sub => ({
        name: sub,
        items: rawData[cat][sub].map((i: any) => {
            const item = { ...i, id: `N-${idCounter++}`, category: cat, subCategory: sub };
            allItems.push(item);
            return item;
        })
    }))
}));
