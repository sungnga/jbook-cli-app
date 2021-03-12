## Steps to building this app
The codebase for each step can be found in the commit link

## IMPLEMENTING IN-BROWSER BUNDLING

### Project setup
- Create project with create-react-app
  - `npx create-react-app jbook-cli-app --template typescript --use-npm`
- Install esbuild package
  - `npm i --save-exact esbuild-wasm@0.8.27`
- Delete all the files in src folder and create an index.tsx file. Render a simple text to make sure the app works

### Creating basic form elements
- Create an input state and initialize it to an empty string. We want to store the content from input field in this state
- Create a code state and initialize it to an empty string. We want to store the code that esbuild has transpiled in this state
- Render a textarea input field and a Submit button

### Accessing the esbuild-wasm in the browser
- ESBuild docs: https://esbuild.github.io/
- We need to get access (download) the web assembly binary (wasm) inside of our React app
- Go into node_modules folder -> esbuild-wasm folder, and copy the esbuild.wasm file. Paste the file in public folder
- The reason why we're doing this is we need this esbuild web assembly inside of our browser. Every file that's placed inside the public directory of a create-react-app can be fetched very easily from inside the browser. This way the esbuild-wasm can fetch the binary code and does the transpiling for us

### Initializing ESBuild 
- Initialize ESBuild by calling `esbuild.startService()`
- What we get back is a service which we can use in our app to transpile and bundle code
- We only want to start this service once when our app is first loaded. So we make use of useEffect() to call this service

### Using refs for arbitrary values
- We want to make use of useRef() hook to keep a reference to a value inside of a component
- In our case, we want to keep a reference of the `service` value by assigning it to `ref.current`. We can then refer to `ref.current` anywhere inside of our component. This will give us a reference to the service we create through ESBuild. We can then use that to do our transpiling and bundling

### Transpiling code
- The transform function will transpile the provided code only and it's an asynchronous operation
- After we transpiled the code, we want to store the result in code state so that we can display it on our page

### ESBuild bundling using unpkgPathPlugin
- When ESBuild is going through the process of bundling our code and when it sees lines of code like 'import/export/export.module', it tries to find the module in the file system
- We want to intercept this step and provide it the path to the module ourselves. We intercept this process with help of the unpkg-path-plugin
- The unpkg.com site will automatically return the path (usually found in the index.js file of a module) of a given NPM module
- In the unpkg-path-plugin.ts file, we overwrite the ESBuild's .onResolve() and .onLoad() functions
- For now we're just going hard-code in the import module just to test that the ESBuild bundling works


## DYNAMIC FETCHING & LOADING OF NPM MODULES

### Dynamically fetching modules
- If we try to fetch a file with a path besides index.js, then we make a request with axios to args.path(url). And this should give us back the contents of whatever file is at that url
- Then we want to take the data we've fetched, the contents of that file, and return an object from onLoad(). This object contains the contents that the ESBuild is trying to get of the file by accessing the file system. And we're providing it the contents here

### Generating the unpkg URL using the URL constructor
- The URL constructor will generate a url object, but we only want the href property inside of it. The href property has the fully form url
- This is still a naive approach to generating a path which doesn't handle all test case