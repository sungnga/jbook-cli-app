## NOTES AND STEPS TO BUILDING THIS WEB APPLICATION
The codebase for each step can be found in the commit link


## IMPLEMENTING IN-BROWSER BUNDLING

### [1. Project setup](https://github.com/sungnga/jbook-cli-app/commit/17db2acb2a1c16b0607035a45a25dc09de0883af?ts=2)
- Create project with create-react-app
  - `npx create-react-app jbook-cli-app --template typescript --use-npm`
- Install esbuild package
  - `npm i --save-exact esbuild-wasm@0.8.27`
  - ESBuild will allow us to transpile and bundle our code in the browser
- Delete all the files in src folder and create an index.tsx file. Render a simple text to make sure the app works

### [2. Creating basic form elements](https://github.com/sungnga/jbook-cli-app/commit/d9ee64dddfdcbe5d1ed1af493faa2c8513ac3b7c?ts=2)
- Create an input state and initialize it to an empty string. We want to store the content from input field in this state
- Create a code state and initialize it to an empty string. We want to store the code that esbuild has transpiled in this state
- Render a textarea input field and a Submit button

### [3. Accessing the esbuild-wasm in the browser](https://github.com/sungnga/jbook-cli-app/commit/24aabf42fbaa8e42288945db67bb48f72d734e88?ts=2)
- ESBuild docs: https://esbuild.github.io/
- We need to get access (download) the web assembly binary (wasm) inside of our React app
- Go into node_modules folder -> esbuild-wasm folder, and copy the esbuild.wasm file. Paste the file in public folder
- The reason why we're doing this is we need this esbuild web assembly inside of our browser. Every file that's placed inside the public directory of a create-react-app can be fetched very easily from inside the browser. This way the esbuild-wasm can fetch the binary code and does the transpiling for us

### [4. Initializing ESBuild](https://github.com/sungnga/jbook-cli-app/commit/ef651a87cb8c293a6d7dc4a63a15da2c289a3025?ts=2)
- Initialize ESBuild by calling `esbuild.startService()`
- What we get back is a service which we can use in our app to transpile and bundle code
- We only want to start this service once when our app is first loaded. So we make use of useEffect() to call this service

### [5. Using refs for arbitrary values](https://github.com/sungnga/jbook-cli-app/commit/418bd7c08618a1a38311b22cef7b1a26b32dbd1a?ts=2)
- We want to make use of useRef() hook to keep a reference to a value inside of a component
- In our case, we want to keep a reference of the `service` value by assigning it to `ref.current`. We can then refer to `ref.current` anywhere inside of our component. This will give us a reference to the service we create through ESBuild. We can then use that to do our transpiling and bundling

### [6. Transpiling code](https://github.com/sungnga/jbook-cli-app/commit/c865f1b277e52b8edc0c60bb72b101c8f4e46856?ts=2)
- The transform function will transpile the provided code only and it's an asynchronous operation
- After we transpiled the code, we want to store the result in code state so that we can display it on our page

### [7. ESBuild bundling using unpkgPathPlugin](https://github.com/sungnga/jbook-cli-app/commit/63913f0dafd296983914c61651faa1c2bbd1358e?ts=2)
- When ESBuild is going through the process of bundling our code and when it sees lines of code like 'import/export/export.module', it tries to find the module in the file system
- We want to intercept this step and provide it the path to the module ourselves. We intercept this process with the help of unpkg-path-plugin
- The unpkg.com site will automatically return the path of a given NPM module. This path is usually found in the index.js file of the module
- In the unpkg-path-plugin.ts file, we overwrite the ESBuild's .onResolve() and .onLoad() functions
- For now we're just going hard-code in the import module just to test that the ESBuild bundling works


## DYNAMIC FETCHING & LOADING OF NPM MODULES

### [8. Dynamically fetching modules](https://github.com/sungnga/jbook-cli-app/commit/2398b860fa448cbee37dac62063807cd660df45a?ts=2)
- If we try to fetch a file with a path besides index.js (usually as the entry point to a given module), then we make a request with axios to args.path(url). And this should give us back the contents of whatever file is at that url
- Then we want to take the data we've fetched, the contents of that file, and return an object from onLoad(). This object contains the contents that the ESBuild is trying to get of the file by accessing the file system. And we're providing it the contents here

### [9. Generating the unpkg URL using the URL constructor](https://github.com/sungnga/jbook-cli-app/commit/661453f8de6a645db59c7fb195cd791a0ab5a3cb?ts=2)
- The URL constructor will generate a url object, but we only want the href property inside of it. The href property has the fully form url
- This is still a naive approach to generating a path which doesn't work in all possible cases

### [10. Resolving nested paths](https://github.com/sungnga/jbook-cli-app/commit/650c6b340cde4ffaaf4860b8a718af1f9705ad03?ts=2)
- We want to bundle a module that has some nested file path inside of it
- In the onLoad function, we can provide the resolveDir property to the next file we're trying to resolve. The resolveDir describes where we found the last file of the import module
- Now the onResolve function receives as args an object that contains path, importer, namespace, and resolveDir properties
  - If the next file we're looking for is a relative path, update the URL constructor to include the resolveDir
- An example process to fetching a nested utils module:
  - onResolve
    - `{path: "index.js", importer: "", namespace: "", resolveDir: ""}`
    - ```ts
      if (args.path === 'index.js') {
        return { path: args.path, namespace: 'a' };
      }
      ```
  - onLoad
    - `{path: "index.js", namespace: "a"}`
    - ```ts
      if (args.path === 'index.js') {
        return {
          loader: 'jsx',
          contents: `
            const message = require('nested-test-pkg');
            console.log(message);
          `
        };
      }
      ```
  - onResolve
    - `{path: "nested-test-pkg", importer: "index.js", namespace: "a", resolveDir: ""}`
    - ```ts
      return {
        namespace: 'a',
        path: `https://unpkg.com/${args.path}`
      };
      ```
  - onLoad
    - `{path: "https://unpkg.com/nested-test-pkg", namespace: "a"}`
    - ```ts
      const { data, request } = await axios.get(args.path);
      return {
        loader: 'jsx',
        contents: data,
        resolveDir: new URL('./', request.responseURL).pathname
      };
      ```
  - XMLHttpRequest 
    - `{responseURL: "https://unpkg.com/nested-test-pkg@1.0.0/src/index.js"}`
  - Data returned from request in index.js file
    - ```
      const toUpperCase = require('./helpers/utils');

      const message = 'hi there';

      module.exports = toUpperCase(message);
      ```
  - onResolve
    - `{path: "./helpers/utils", importer: "https://unpkg.com/nested-test-pkg", namespace: "a", resolveDir: "/nested-test-pkg@1.0.0/src"}`
    - ```ts
      if (args.path.includes('./') || args.path.includes('../')) {
        return {
          namespace: 'a',
          path: new URL(
            args.path,
            'https://unpkg.com' + args.resolveDir + '/'
          ).href
        };
      }
      ```
  - onLoad
    - `{path: "https://unpkg.com/nested-test-pkg@1.0.0/src/helpers/utils", namespace: "a"}`
    - ```ts
      const { data, request } = await axios.get(args.path);
      return {
        loader: 'jsx',
        contents: data,
        resolveDir: new URL('./', request.responseURL).pathname
      };
      ```
  - XMLHttpRequest
    - `{responseURL: "https://unpkg.com/nested-test-pkg@1.0.0/src/helpers/utils.js"}`
  - Data returned from request in utils.js file
    - ```
      module.exports = function (str) {
        return str.toUpperCase();
      };
      ```
    - Note that this file doesn't have another import/require module. So it won't try to go find the next file

### [11. Setup defines during bundling](https://github.com/sungnga/jbook-cli-app/commit/6bb066fd9a4e456a0c06c0f0885d0a8e6729ae8d?ts=2)
- ESBuild define docs: https://esbuild.github.io/api/#define
- Define allows us to define a value inside of code whenever we are doing a bundling process
- When bundling we get a warning message
  - `warning: Define "process.env.NODE_ENV" when bundling for the browser`
- We need to setup ESBuild to define the value of "process.env.NODE_ENV" whenever we're doing a bundling
- We do the bundling in the ref.current.build() method and this is where we can include the `define` property


## CACHING FOR BIG PERFORMANCE GAINS

### [12. Implementing a caching layer](https://github.com/sungnga/jbook-cli-app/commit/285fb7bfa80721c0e566e712e412a7377e84427a?ts=2)
- Whenever the onLoad function is about to make a request to unpkg.com, we want to implement a caching layer. In this cache object, we want to see if we have fetched that package before. If so, return it immediately. Otherwise, make the request and store the response inside the cache, and then return the response off to onLoad
- onLoad -> cache object -> unpkg.com
- We don't want to store our cache data in localStorage, because it maybe contain a lot of data and may potentially get deleted out of localStorage
- An alternative method of storing information inside the browser is indexedDB. Similar to localStorage, it's an information store that we can make use of inside the browser and can store much more information than localStorage
- We're going to use a helper library called localforage to help us work easier with indexedDB. It falls back on localStorage if the user's browser doesn't have indexedDB or WebSQL support
- Import: `npm i localforage`
- Caching with key-value pairs in the onLoad function after we made a request and fetched the data
  - The key is the path.args and the value is the return object from onLoad

### [13. Fixing a Typescript error while caching](https://github.com/sungnga/jbook-cli-app/commit/e1bb56095ee0322c55c34d3786fb42f42b625da7?ts=2)

### [14. Bundling user input](https://github.com/sungnga/jbook-cli-app/commit/9e3ac721bdac6ba791d08c40a8fb4017582b80fe?ts=2)
- Up until this point we have been hard-coding in the contents value for the index.js file, on which we specified as the entryPoints to tell ESBuild to start the bundling process there
- Now we want the value for this contents to come from the input state instead. This is the value that the user types into the textarea input field and we store it in input state. For example, the user may type in `const a = 1; console.log(a);`
- We need to communicate this value stored in input state to our plugin. In the `plugins` property, pass in the input state to the unpkgPathPlugin() method as an argument
- The unpkgPathPlugin function in the plugin file should receive the inputCode value as a parameter. Then in the onLoad function, if args.path is equal to index.js, we provide that value to the `contents` property
- So when a user submits a piece of code, ESBuild should be able to bundle that code

### [15. Refactoring by breaking up resolve logic with filters](https://github.com/sungnga/jbook-cli-app/commit/53a467523fe67d08de39ad1713d6eb643b51c086?ts=2)
- We can define multiple different onResolve functions and use the filter to control the way in which we actually resolve a path rather than these if statements  

### [16. Refactoring to multiple plugins](https://github.com/sungnga/jbook-cli-app/commit/19ae44ed2f834a08c5b8e48bcefbfd728ad81082?ts=2)
- Let's take the all the logic code around onLoad and extract it into a separate second plugin file. This will make it easier for us to understand all the different plugins inside of our project and it will make it easier to reuse these plugins in the future as our project grows
- Import the second plugin file in the main index.tsx file and then call the plugin method inside the plugins array

### [17. Loading CSS files](https://github.com/sungnga/jbook-cli-app/commit/cbd3e6003f61c0859ca06a0df159335a9a94f970?ts=2)
- Docs for loading CSS files: https://esbuild.github.io/content-types/#css
- Whenever ESBuild does some bundling, if we import CSS, ESBuild is going to output two separate files. The first containing all the JS code and the second containing all the CSS. In a normal circumstance, ESBuild will write these two output files to a file system. However, in our app, we don't have a file system for ESBuild to write to. We will get an error when we import a CSS file, even though we successfully able to fetch the CSS data from unpkg.com
- One work-around is to inject the CSS data into a JS code snippet and insert it in the head tag of the browser DOM
- If the fileType is `css`, then we use this JS code snippet as contents property. Otherwise, use the data that we get back from the request as contents 

### [18. Refactoring onLoad with load filters](https://github.com/sungnga/jbook-cli-app/commit/1c5350a9b7be66d795f9eda1f08e722d6deb9292?ts=2)
- We want to create different onLoad functions to handle different file types
- We want to handle the index.js file, the CSS files, and any other arbitrary files

### [19. Extracting common caching logic](https://github.com/sungnga/jbook-cli-app/commit/bff3cdf4a40d6f8d937952aff0bb042943d44824?ts=2)
- Let's extract the duplicated caching logic into its own separate onLoad function. If we already have the fetched file cached in indexedDB, then we're just going to return the cachedResult

### [20. A better way of loading WASM](https://github.com/sungnga/jbook-cli-app/commit/1ccda4f4318eebee82d5dd57b0ac78696a3bea85?ts=2)
- Previously, the way we load the esbuild.wasm (web assembly binary) file into our browser is by dragging the file into the public directory of our project. We've been hosting this web assembly ourselves in the public directory
- A better approach is to provide a link of the web assembly binary that is hosted on unpkg.com
- So whenever we start up ESBuild it'll go fetch the web assembly binary from unpkg.com instead
  - `wasmURL: 'https://unpkg.com/esbuild-wasm@0.8.27/esbuild.wasm'`


## SAFELY HANDLING UNTRUSTED CODE EXECUTION

### [21. Considerations around code execution](https://github.com/sungnga/jbook-cli-app/commit/76025ce7e765eb13277f361ac943497361eb2c31?ts=2)
- User-provided code might throw errors and cause our program to crash
  - Solution: if we execute a user's code in an iframe
  - Won't crash our application
- Use-provided code might mutate the DOM, causing our program to crash
  - Solution: if we execute a user's code in an iframe
  - If the user decides to mutate the DOM, they're mutating the DOM inside the iframe, not our parent document
- A user might accidentally run code provided by another malicious user
  - Solution: if we execute a user's code in an iframe with direct communication disabled
  - The user's JS code is being executed inside the iframe, so any malicious code cannot affect the parent document
- A use might accidentally run code in infinite loop causing the browser to crash

### Displaying iframes
- An iframe element is used to embed one html document into another. This is usually what an iframe is used for
- Create an html doc in public directory. Then create an iframe element inside the App component. We're going to use this iframe element to embed the html doc to display its content

### [22. Direct access between frames](https://github.com/sungnga/jbook-cli-app/commit/428b6578aa9e422a401991b2570faf632ad9b53a?ts=2)
- Crossing context
  - The current settings of our iframe **allow** communication between the parent and the child. Can reach from the parent into the child iframe and vice versa and get access to different properties
- A direct access between frames is **allowed** when...
  - The iframe element does not have a `sandbox` property, or has a `sandbox="allow-same-origin"` property
  - **AND**
  - We fetch the parent HTML doc and the frame HTML doc from the exact same...
    - Domain
    - Port
    - Protocol (http vs https)
- To disallow direct access between frames...
  - In iframe element, add `sandbox=""`. This will isolate the contents from the iframe and add an extra layer of security
  - Or have the parent doc and the child doc served on different server ports

### The solutions for our app
- Sandboxing the child frame from the parent document, so there's no direct communication between frames and the child frame cannot have access to the parent contents
- The child doc and the parent doc will be served on the same localhost. We don't have to build an extra infrastructure to host the html doc on a different server and make the extra request to fetch the html doc. So our app will be very fast
- However, the downside to this approach is the child frame will be restricted from several in-browser features such as accessing localStorage or cookies, or run any Javascript code through scripts

### Our app flow
- We want to run something like 'jbook serve'
- This should start a server on localhost:4005
- User will write code into an editor
- We bundle in the browser
- We execute the user's code in iframe

### iframes with srcDocs
- In the iframe element, when we set the `src` property to some location, iframe will make a request to some external site to get the content
- However, the `srcDoc` property allows us to load up some content into an iframe using a string
- So we can make use of the `srcDoc` property to get the child frame html doc right inside of our application
- Even though the content of the child frame is generated locally inside of our app, by adding that `sandbox=""` in the iframe element, we are preventing communication between the child and the prevent

### [23. Executing iframe using srcDoc](https://github.com/sungnga/jbook-cli-app/commit/53e89330a5dd6089ac8723b3d08378d280964eac?ts=2)
- Create an html string that contains a script tag and in the script tag contains the code state. The code state contains the bundle code generated by ESBuild of our user's code
- Assign the `srcDoc` property of the iframe element to this html string
- Set the `sandbox` property to allow the iframe to run scripts

### [24. Passing code to the iframe](https://github.com/sungnga/jbook-cli-app/commit/2c4d14af00798a7b0f6169c9cf350185b36c6e11?ts=2)
- Even though we disabled direct communication between frames, we can still have some indirect communication between frames using addEventListener. The parent document can listen for some message from the child frame and vice versa
- When a user submits their code -> we're going to bundle that code -> we're going to emit an event down to the iframe -> the iframe should receive that event and that event should contain all of our code -> the iframe can then execute that bundle code by calling eval() on event.data -> the result would be displayed in the iframe

### [25. Highlighting errors in iframe](https://github.com/sungnga/jbook-cli-app/commit/5feddb69788f385e6e095656567901752091d918?ts=2)
- If an error occurs while iframe executes the user's code, we not only want to display the error in the browser console, we also want to display the error message in the iframe. This way the user can see what just went wrong even if they don't have their development console open
- We style the error message in red color

### [26. Resetting the iframe contents](https://github.com/sungnga/jbook-cli-app/commit/4748e1bc2b14768acb2defb4d7d638c87b42d743?ts=2)
- Let's say a user enters in some code and submits it, and then they add/delete more code or edit existing code and submit again. Now, we want to ensure that *each time before* a user's code get executed again, that it resets/reloads the entire iframe html document to its original state. It does a full refresh of the contents of the iframe
- This way a user will always have a very consistent environment and to make sure that we don't get any leakage of variables or states between different executions of their code
- To do this, right before we start the bundling process, we're going to update the `srcdoc` property of the iframe manually. We set the iframe.current `srcdoc` property to the html string that we created for the iframe html doc
- To test this out that the iframe html doc has been reset:
  - First enter in: `document.body.innerHTML = '';`
  - This empties out the body tag and also removes our root id
  - Then enter: `console.log(document.querySelector('#root'));`
  - We should get back a div tag that contains a root id


## DISPLAYING A CODE EDITOR IN A REACT APP

### [27. Displaying a code editor](https://github.com/sungnga/jbook-cli-app/commit/faeef07ea6e08eab85685eaa65bc0297e8c674db?ts=2)
- We are going to use an open source browser-based code editor called Monaco Editor. It will give us an almost-perfect editing experience such as syntax highlighting, autocomplete, code linting, etc.
- Install: `npm i --save-exact @monaco-editor/react@3.7.5`
- monaco-editor/react docs: `https://www.npmjs.com/package/@monaco-editor/react`

### [28. Configuring the Monaco Editor](https://github.com/sungnga/jbook-cli-app/commit/47f716bac82ea4a4944edda3f52cb4117c3ce46e?ts=2)
- The Monaco Editor React component is a wrapper around the real Monaco Editor. We can provide different configuration options to the React component, but we can also apply some advanced config to the actual Monaco Editor
- The different configs can be found in the Monaco Editor React type definition file. Cmd+click on the import module name
- To see the different configs for the actual Monaco Editor itself, we need to install its monaco-editor package. We can then have access to its type definition file
  - Install: `npm i monaco-editor`
- Our editor configurations:
  - Make the editor theme dark
  - Set the language to javascript. We get all the JS syntax highlighting
  - Turn on word-wrap
  - Disable the editor mini-map
  - Set showUnused statements to false
  - Remove the extra spacing on the left side window
  - Set the font size to 16
  - Don't allow user to scroll beyond the last line
  - Allow the editor to relay itself correctly when the user shrinks or expands the editor
  - Remove the extra new line that gets added to the end after the code is formatted

### [29. Setting the initial value for Editor](https://github.com/sungnga/jbook-cli-app/commit/e36b528b03bed68e891199b678a24ffca22d7210?ts=2)
- When a user opens our application, we want to display an initial value inside of the code editor. It can be anything
- We need to define a CodeEditorProps interface for our CodeEditor component to be able to receive props

### [30. Handling Editor change events](https://github.com/sungnga/jbook-cli-app/commit/41f36ee0daa349c30c56f8642305e713b2d4c15b?ts=2)
- We want to update the value of input state in our App component whenever there's a change inside the Editor
- So we add an onChange props to the CodeEditor component and add a callback to call the setInput() to set the input state with the value coming from the code editor

### [31. Adding a type definition to editorDidMount props](https://github.com/sungnga/jbook-cli-app/commit/3b8b354f2dd58b2b02978cdf64b8f60fce1eda7f?ts=2)
- We need to manually import the EditorDidMount type definition file to add a type to the editorDidMount props in MonacoEditor component
- Now that we added a type definition to MonacoEditor, we can update the editor's tab size to 2 instead of 4

### [32. Adding prettier to our Editor](https://github.com/sungnga/jbook-cli-app/commit/b67847eeee8f254a5d14741aafcab94be03554de?ts=2)
- Install prettier and its type def file: `npm i prettier @types/prettier`
- When a user clicks on the Format button, they will get automatic code formatting to their code. We specify what will get formatted
- We use useRef() hook to reference the monacoEditor instance. We call .getValue() on it to get the value in the Editor. We format the value using prettier library. Then we call .setValue() on the editorRef to set the formatted value back in the Editor

### [33. Adding Bulma CSS library, floating the Format button](https://github.com/sungnga/jbook-cli-app/commit/c242a89547657d6f9f629eedcc898648b9e9002e?ts=2)
- We're going to use Bulma CSS library to style our Editor and our project in general. We're going to use the bulmaswatch library because it has some extra features in it
- Install: `npm i bulmaswatch`
- We will apply the `superhero` theme to the overall look of our app
- Add CSS styles to the Format button
- Place the Format button inside of the Editor and only show the button when the user mouses over the Editor. And if the user is not in the Editor, we want to hide this button

### [34. Fixing syntax highlighting](https://github.com/sungnga/jbook-cli-app/commit/3dffe314043935ce316a2155f53173a6efdb6e9c?ts=2)
- Although the Monaco Editor knows what JSX is, it doesn't apply syntax highlighting to it
- We will be using two external libraries to help us out
- Install: `npm i --save-exact monaco-jsx-highlighter@0.0.15 jscodeshift@0.11.0 @types/jscodeshift@0.7.2`
- We will overwrite the default CSS styles of the syntax highlighter library with our own custom CSS


## HOW TO EXTRACT REUSABLE COMPONENTS

### [35. Refactoring out a Preview component](https://github.com/sungnga/jbook-cli-app/commit/1a5585fc217be80398956dca6edeec90b4c48ae6?ts=2)
- We're going to extract all the code inside the App component that is related to an iframe that receives the bundle code, executes it, and displays the result into a separate component. The component is called Preview
- The Preview component receives a code as props from the App parent component
  - Define a PreviewProps interface and set it in the Preview component. This way any other components that use the Preview component must satisfy its condition
- Import the Preview component in the App component. Render the Preview component and pass down to it the code state as code props

### [36. Extracting bundling logic](https://github.com/sungnga/jbook-cli-app/commit/c78608b330b908ca578d36e54eb36d39434d012d?ts=2)
- Next we're going to exact code related to ESBuild bundling out of the App component into a separate file
- The asynchronous bundle function:
  - Takes a rawCode (from the input state in App component) as an argument
  - Checks to see if an ESBuild service has been started. If it hasn't, initialize a new service
  - If it has, then start the bundling process by calling service.build()
  - Returns the bundled result
- Import the bundle function in App component. When the user clicks the Submit button, the bundle function gets called with the input state as an argument. Once we get the back the bundled output, call setCode() to store it in code state

### [37. Refactoring for multiple editors and preview windows](https://github.com/sungnga/jbook-cli-app/commit/cdf688ab9cefe74b3c8558f6308302cff079b0a1?ts=2)
- We may only have one App component, but we may have multiple code editors and multiple preview windows generated in our project. We may want to wrap our CodeEditor component and Preview component inside a more generic component called CodeCell component
- Now we have a way to reuse a component that contains a single code editor and a single preview window
- Import the CodeCell component in App component and we can render this component as many times as we want


## DRAGGABLE RESIZING COMPONENTS

### [38. Adding resizable panes with React-Resizable library, setting up](https://github.com/sungnga/jbook-cli-app/commit/9b16d78774ab40cbba15a0d8e9bd9ff0add9ea6d?ts=2)
- Each CodeCell component has a CodeEditor component and a Preview component. They should display next to each other. We want to have a resize handle that allows us to drag from left to right to shrink/expand both the editor and the preview window. We want a second resize handle at the bottom of the CodeCell to expand/shrink both of the editor and preview window at the same time
- We're going to use a library called React-Resizable to help us build the resize handle
- Install: `npm i react-resizable @types/react-resizable`
- Setting up React-Resizable:
  - Create a Resizable component and define a ResizableProps interface for it. This component receives a direction props from the parent component. This component also receives a children props. This allows other components to render inside of this component. In our case, they're the CodeEditor and Preview components. Import the ResizableBox component from react-resizable
  - Import the Resizable component in the CodeCell component. Render it and wrap both the CodeEditor and Preview components inside of it. Pass down a direction props and set it to "vertical"

### [39. Setting a resize handle, adding CSS](https://github.com/sungnga/jbook-cli-app/commit/042b5193ba2c4e74501f1d7052cef3a06c842904?ts=2)
- Render the ResizableBox component in the Resizable component. The ResizableBox component can render children components. In our case, it will render the CodedEditor and Preview components
- We can find a list of props that we want to provide to the ResizableBox component in the type def file
  - The width and height props are the starting width and height. Must provide these to be able to see the component on screen
  - The resizeHandles props specifies the location of where the handle is going to be - s, n, w, e, etc.
- Import the Resizable.css file in the Resizable component

### [40. Expanding the resizer handle horizontally](https://github.com/sungnga/jbook-cli-app/commit/0fd591de1be4caaccb25bc237724a3aa2ab3040b?ts=2)
- We can delete the Submit button. We don't want a user have to click a button to run their code. Instead, whenever a user edits some code we immediately feed that code over to the Preview window/component and try to run it
- Let's add some styling so that the CodeEditor and the Preview window show up next to each other horizontally. We want to set the flexDirection on the items inside the Resizable component to `row`
- We want the ResizableBox component to take up the entire width of the browser window (100% width). Unfortunately the ResizableBox component does not support percentage widths. The work-around to this problem is to set the width property to `Infinity`. This allows the width to take up the horizontal space as possible
- Now the resizer handle spans the entire width of the screen

### [41. Expanding the CodeEditor, resizing vertically](https://github.com/sungnga/jbook-cli-app/commit/d580a43721d549b9018169e533386c5a3032c6d6?ts=2)
- We want the Preview window to have a white background to contrast the CodeEditor of dark background. This ensures that the user knows that some contents will appear there. And we want the Preview iframe to take up 100% height
- When there is space, we want the CodeEditor to take up 100% width. And it takes up 100% height
- We add a max and min constraints to the ResizableBox component so that the user cannot drag the resizer all the way to the bottom of the screen or minimize the CodeCell to nothing

### [42. Resizing horizontally, applying horizontal resize props](https://github.com/sungnga/jbook-cli-app/commit/01a99e33d5e238cb3136d2ef3e4c155ab7dc18a9?ts=2)
- Inside of the CodeCell component, add another Resizable component and wrap the CodeEditor component inside of it. Pass down the direction props and set it to 'horizontal'. Now there should be a resizer handle on the editor for us to drag to resize it
- In order for resizing horizontally to work, we need to add some logic to decide whether the direction props that's being passed down from the parent component to Resizable component is 'horizontal' or 'vertical'. Then we can provide different resizableProps object to each
- To annotate the type of resizableProps, we can import the ResizableBoxProps type definition into our project. This way TS will have enough information to make sure that we provide all the required properties inside the two resizableProps objects - one for horizontal and one for vertical resizer

### [43. Updating resizer props, improving resize performance](https://github.com/sungnga/jbook-cli-app/commit/b958fad348d89a69d4c61f74ada6c3613101f807?ts=2)
- Right now our editor and preview window don't resize themselves when the browser window  changes. It would be nice if both the editor and preview window would shrink and expand as the browser window change
- To do this, we want to make use of useEffect() hook to listen for changes to the browser window (addEventListener on window) and update the states that keep track of the size of window's width and height
- We can then pass down the window width and height states to the resizableProps and this in turn, updates the ResizableBox component  
- Since using useEffect() hook will cause the page to re-render every time the window size changes, we don't want it to re-render so frequently. For this, we want to make use of a technique known as debouncing inside of useEffect() hook. It will only update the window width and height states after a certain amount of setTimeout

### [44. Synchronizing width state](https://github.com/sungnga/jbook-cli-app/commit/bcc5bfa64571118c25622e3ef5792dc11f4115b7?ts=2)
- Currently, we've set the initial width of the editor to be 75% of the browser window width and the preview window to take up the remaining 25% width. A user can use the resizer handle to resize the widths of both. However, when they start to change or resize the browser window dimensions, the preview window jumps to its initial 25% width
- This behavior happens because the ResizableBox component has its own internal width state. The Resizable component width prop gets updated with the new width, but the internal width state for the ResizableBox component never got updated as well. So when the browser window size changes, it causes the Resizable component to re-render and since the ResizableBox component is a child of it, ResizableBox gets re-render as well. It re-renders with the initial width state
- We need to synchronize the width state of the ResizableBox whenever we update the width prop of the parent Resizable component

### [45. Adding debouncing logic](https://github.com/sungnga/jbook-cli-app/commit/0c454b1a3748e3700028abf64d226ee8da440fdb?ts=2)
- We want our user to be able to type into the code editor and then if they stop typing for about one second or so, we want to automatically take that code, bundle it, and execute it inside the preview window. We want all this to be automatic because we took out the Submit button that we had previously. We also want to make sure that there is a slight delay between the user's last key press and when we attempt to bundle the user's code. We don't want to bundle with every key press
- This entire process is referred to as debouncing. Debouncing is when we want to allow some function or some code to run (as much as possible) and only after some period of time elapses we then want to do some other process
- Timeline:
  - User types in editor -> input state updated -> set timer to bundle in 1s
  - User types in editor -> input state updated -> cancel prev timer & set time to bundle in 1s
  - 1 second passes without any update to input state
  - Run bundling logic

### [46. Adding an execution timeout in Preview component](https://github.com/sungnga/jbook-cli-app/commit/48e080ecd567514b6ab64ad60cc9b77869dbfa67?ts=2)
- We can delay the postMessage function with a setTimeout. This is going to make sure that our browser has enough time to update the srcdoc and setup an event listener and watch for our postMessage attempt that's going to come about 50 milliseconds later
- And now the result persists on the preview window


## TECHNIQUES FOR ERROR HANDLING IN REACT APPS
- There are 3 kinds of errors that might happen when we start to bundle and execute a user's code:
  - A bundling error or syntax error - invalid code and we can't bundle it
  - A synchronous runtime error - error during execution
  - An asynchronous error - this error gets thrown at some future point in time

### [47. Extracting reusable error handling logic](https://github.com/sungnga/jbook-cli-app/commit/9d3b10229f1cc7a54901f77617c99c00af24fcd4?ts=2)
- Extract the error handling logic into its own function so that we can reuse it
- Handling synchronous runtime errors

### [48. Handling async errors](https://github.com/sungnga/jbook-cli-app/commit/750bc96b11fff35eafc41249e64e005276b46bda?ts=2)
- To make sure that we capture any error that occurs at any point in time inside a browser-based environment, we can set up an event listener on our window object and watch for a specific type of event - an ErrorEvent
- We can display the error message to the user from `event.error`

### [49. Capturing bundling errors, printing the captured error](https://github.com/sungnga/jbook-cli-app/commit/076bcf4999c08add801ebb45ede0bd05a047528e?ts=2)
- The bundling error may occur when we run service.build(). So we can catch the error in a try/catch block
- From the `bundle` function, we want to return an object that contains strings of either the bundled code or the error message
- The `bundle` function is being called in the CodeCell component. So we can create a piece of state called err and store the error that we might get back from the function here
- Then pass down the err state as err props to the Preview child component to be displayed to the user


## CREATING A MARKDOWN EDITOR IN A REACT APP
- The next feature we're going to build is our TextCell component
  - The text cell is an area where a user can click in and write some documentation. When click out of the text cell, the user can see a nicely formatted text
  - The TextCell component will have 2 different modes
    - A view mode where we display whatever the user typed in there
    - An edit mode is when a user click into the TextCell. A markdown editor is on the left hand side and a preview window for the markdown on the right hand side. We will have a toolbar for formatting text just above the markdown editor

### [50. Creating a TextEditor component using react-md-editor library](https://github.com/sungnga/jbook-cli-app/commit/4631768bf7496efd8332d6c93581bda63f6e65ca?ts=2)
- We will be using a library called React Markdown Editor to help us build the markdown editor for our project
- Install: `npm i --save-exact @uiw/react-md-editor@2.1.1`
- Docs: https://www.npmjs.com/package/@uiw/react-md-editor
- We will make use of 2 components from this library
  - MDEditor component will display a markdown editor on the screen
  - MDEditor.Markdown component will display a preview window to the user

### [51. Toggling the markdown editor mode](https://github.com/sungnga/jbook-cli-app/commit/4fc0b82275bc0950b91970d1eccb83ba941899d5?ts=2)
- We want our user to be able to toggle between the edit mode and the view mode
- If the editing mode is true, the editor is opened. And as long as the user clicks inside of the editor it remains open
- If the user starts clicking anywhere outside of the editor, the editing mode becomes false and the editor will close and the view mode comes on

### [52. Fixing CSS conflicts, applying styles to markdown](https://github.com/sungnga/jbook-cli-app/commit/3c2af37f33f82eb9ae4f2907fc155f94545008fc?ts=2)
- Solving class name conflicts between react-md-editor and Bulma CSS
- Fixing the divider height
- Restyling markdown editor resizer handle
- Applying additional styling to markdown editor
- Applying the dark theme to the markdown

### [53. Adding state to the editor, last touch of markdown styling](https://github.com/sungnga/jbook-cli-app/commit/4acfbfd29b5a9906a1d956787682793d4c68c470?ts=2)
- In the TextEditor component, we want to add in a piece of state to keep track of whatever the user types into the editor and show that inside the preview portion of the component
- Add a last touch of styling to our markdown to make it look like a card. CSS styling coming from Bulma


## DESIGN PATTERNS FOR REDUX WITH TYPESCRIPT

### [54. Creating file structures, installing Redux-related modules](https://github.com/sungnga/jbook-cli-app/commit/7443c62771cc175f5abc39b88a931dc0992398a7?ts=2)
- Install: `npm i --save-exact @types/react-redux@7.1.15 axios@0.21.1 react-redux@7.2.2 redux@4.0.5 redux-thunk@2.3.0`

### [55. Defining action types and cell types, create interface definitions](https://github.com/sungnga/jbook-cli-app/commit/6d366d31efaebd916babe8a1306616bb158bae10?ts=2)
- Define action types enum - in action-types folder
- Create actions interface definitions - in actions folder
  - For each ActionType, we will create an interface that describes an action (with type and payload properties) that will eventually be dispatched by one of our action creators, and then processed by one of our reducers
- Defining what a cell is - in cell.ts file
  - Create a cell interface definition that describes what properties a cell has
  - We can then reuse this cell interface throughout Redux
  - Define a type CellTypes so we can change cell types in one location only

### [56. Setting up cells reducer, adding simple switch cases](https://github.com/sungnga/jbook-cli-app/commit/d9897b029ed1e158d0e677711ff0740172ccfe5c?ts=2)
- Define a cells reducer - in reducers/cellsReducer.ts file
- A cells reducer will manage the following properties:
  - data: listing of all cells. Is an object where the key is the cell id and value is the cell object
  - loading: true/false whether we are fetching data. Is a boolean type
  - error: errors related to saving cells. Is either a string or null
  - order: order of cells. Is an array of strings
- Add a switch statement to handle different action.type from incoming actions of this reducer. For now, we're just going to return state for each case, but will come back to put in additional implementation for each

### [57. Creating and exporting the store](https://github.com/sungnga/jbook-cli-app/commit/9f0b445c8eb2d6039e30d2e05388c3bf3a2d1e8a?ts=2)
- Create a reducers using combineReducers() - in reducers/index.ts file
  - Define the reducers type
- Create a store using createStore() - in store.ts file
- Create an entry point index.ts file at the root of state directory
  - Export everything related to Redux into this file
  - Export the store
  - Export the reducers

### [58. Connecting React to Redux](https://github.com/sungnga/jbook-cli-app/commit/affa770fa9a91e2f692b500bc499e2f7bde57f52?ts=2)
- Connect React to Redux - in index.tsx file of project root directory
  - Import the Provider component from react-redux
  - Render the Provider and wrap all of our existing components inside the Provider
  - Import the store. Pass down the store as store props in the Provider
  - Now all of our components that are inside this Provider will have access to the Redux store

### [59. Adding implementations of action creators](https://github.com/sungnga/jbook-cli-app/commit/0ce2ad9c0f294ab8b7e411285fc4b474604db88c?ts=2)
- All of our action creators, with the exception of fetchCells, are synchronous in nature. Whenever we call these action creators, we get back the actions instantaneously because these are not outside requests
- Write a separate function for each action creators - in action-creators/index.ts file
  - updateCell()
  - deleteCell()
  - moveCell()
  - insertCellBefore()
- Annotate the return type of each action creator functions. Need to export then import each type action interfaces
- Define type Direction - in actions/index.ts file
- Add in implementations of action creators - in action-creators/index.ts file

### [60. Adding implementations for update cell logic](https://github.com/sungnga/jbook-cli-app/commit/f78552cea8ff2f49246b3155c8818f784007e850?ts=2)
- In cells reducer, we're going to add in the implementations logic for UPDATE_CELL ActionType 


## SIMPLIFY STATE UPDATES WITH IMMER LIBRARY
- Updating the states can get very complicated. For that, we're going to use a package called Immer to help us update our states
- Immer allows us to make direct updates to our state object without having to write complicated spread statements like we did in the previous step
- Install: `npm i immer`
- Immer docs: https://immerjs.github.io/immer/docs/update-patterns

### [61. Updating cells with Immer](https://github.com/sungnga/jbook-cli-app/commit/71c552a1a95b6637a1640c1645239d553cbd05f5?ts=2)
- Handle UPDATE_CELL action
- Import the produce function from immer
- Wrap our entire reducer function inside of the produce() function
- We can remove the return type of reducer function because sometimes we don't need to return anything
- Add a `return;` to make sure that we don't run other switch cases after
- However, we should `return state;` (return state object) to satisfy Typescript. Or else TS may give us an error of `undefined` when we run our actions

### [62. Removing a cell](https://github.com/sungnga/jbook-cli-app/commit/bb5c729f47193382b2f44f478f8e8b6afde3c6d1?ts=2)
- Handle DELETE_CELL action - in cellsReducer.ts file
- The payload is the id of the cell we want to delete
- When deleting a cell, we need to delete it from the `data` object by the cell id and remove the cell id from the `order` array
- Basically we want to perform an object mutation and an array mutation on our state

### [63. Swapping cell placement](https://github.com/sungnga/jbook-cli-app/commit/d1b4dc1143312257367e3ebc67181bc69082dd0d?ts=2)
- Handle MOVE_CELL action - in cellsReducer.ts file
- The payload we get is the cell id and the direction (up or down the list)
- We swap the cells depending on the direction given

### [64. Inserting new cells](https://github.com/sungnga/jbook-cli-app/commit/61be844302a8c1fe370a21f9a3850bed1201aced?ts=2)
- Handle INSERT_CELL_BEFORE action - in cellsReducer.ts file
- The payload is the cell id where we want to insert a new cell before it and the new cell data
- When inserting a new cell, we need to update the `order` array with the cell id and update the `data` object with the cell object

### [65. Manual testing of a Redux store](https://github.com/sungnga/jbook-cli-app/commit/a84388e6cdaf7973ad514c0ec7d5502c68ba982c?ts=2)
- We can call store.dispatch() to dispatch an action. Provide the action type and the payload
- To get a state in the store, just call store.getState()
- To test out our Redux store, in store.ts file:
  ```js
  import { ActionType } from './action-types';

  store.dispatch({
    type: ActionType.INSERT_CELL_BEFORE,
    payload: {
      id: null,
      type: 'code'
    }
  });

  store.dispatch({
    type: ActionType.INSERT_CELL_BEFORE,
    payload: {
      id: null,
      type: 'text'
    }
  });

  console.log(store.getState());
  ```


## BINDING REACT WITH REDUX

### [66. Creating CellList and CellListItem components](https://github.com/sungnga/jbook-cli-app/commit/e47879e03604b7e2777107b6ca22ded04162ece7?ts=2)
- The CellList component renders a list of cells to the user
  - This component gets the list of cells from the store and display them on the screen
  - It also needs the order array for it to figure out the order to display the cells in
- The CellListItem component renders each individual cell
  - Its job is to figure out what kind of cell to show: code cell or text cell
  - It also has 3 buttons: delete the cell, move the cell up, and move the cell down 

### [67. Creating a typed selector: useTypedSelector hook](https://github.com/sungnga/jbook-cli-app/commit/0da5f385a1e3c2c1bdd43db4e4de7662290101f1?ts=2)
- Create a useTypedSelector hook. This hook will understand the type of data that is stored inside of our store
- Whenever we want to access any state inside a component, we're going to use this useTypedSelector hook

### [68. Selecting an ordered list, rendering cell types](https://github.com/sungnga/jbook-cli-app/commit/22981fae968140da1dc30e9f9373deea18868df4?ts=2)
- In CellList component, call useTypedSelector() hook to access the state in Redux store, and we only want to get the cells state. Then destructure data and order properties from cells state
- Get the list of cells in data object by mapping over the order array. This will return an array of cells in the order that the cell id is stored in the order array
- Then iterate over the cells array and display each cell in a `<CellListItem />` component. Pass down the cell object as cell props to the CellListItem component
- In the CellListItem component:
  - Receive the cell props from the parent component
  - Create a CellListItemProps interface definition that contains the cell props set to Cell type. Then assign this interface to CellListItem component
  - If the cell type is equal to 'code', render the `<CodeCell />` component
  - Else render the `<TextEditor />` component

### [69. Creating an action creator helper: useActions hook](https://github.com/sungnga/jbook-cli-app/commit/03eb51beacc37f3f6c2fe6f87f7f9c19999d341f?ts=2)
- Whenever we call useActions() hook inside a component, we will have access to all the actions available and then we can destructure just the ones we want to use

### [70. Refactoring: extracting state from CodeCell component](https://github.com/sungnga/jbook-cli-app/commit/c1a74a073c62f1cbd8fc7b4649155a3abf2522e1?ts=2)
- Currently our CodeCell component has code, err, and input states. We make use of these states for testing purposes while we were building the CodeCell (the CodeEditor and Preview window)
- Now we no longer need to use these states. The CodeCell component is rendered inside the CellListItem parent component. The CellListItem component will provide the cell object (coming from the store) as cell props, and the CodeCell component can dispatch an action to update the cell state in Redux store
- In CodeCell component:
  - Receive the cell props from the CellListItem parent component
  - Define a CodeCellProps interface for the component
  - Call useActions() hook and destructure the `updateCell` action
  - We won't make use of the input state anymore. We replace `input` with `cell.content`. Replace `setInput()` with `updateCell()`

### [71. Refactoring: extracting state from TextEditor component](https://github.com/sungnga/jbook-cli-app/commit/202443fe93c12d9f089da85c43304706c2270322?ts=2)
- Currently the TextEditor component is using the `value` state to keep track of the value from the MDEditor and MDEditor.Markdown component
- In TextEditor component:
  - Receive the cell props from the CellListItem parent component
  - Define a TextEditorProps interface for the component
  - Call useActions() hook and destructure the `updateCell` action
  - Replace `value` state with `cell.content`
  - Replace `setValue()` with `updateCell()`

### [72. Creating ActionBar component](https://github.com/sungnga/jbook-cli-app/commit/4f76f88f2a26bf5d61a8797c4f59af616a1b0031?ts=2)
- This ActionBar component is rendered in the CellListItem parent component. It should receive a cell id as id props
- Define the props interface definitions
- Import the moveCell and deleteCell actions using useActions() hook
- This component renders the Up, Down, and Delete buttons
- Add an onClick event handler to each button elements. When a user clicks on the Up or Down button, call the moveCell() action and pass in the id and the direction as arguments
- When they click on the Delete button, call the delete() action and pass in the id as an argument

### [73. Adding icon buttons, applying custom CSS to ActionBar component](https://github.com/sungnga/jbook-cli-app/commit/499f8da50acc7d01091ba4b218b2f4009c096d9d?ts=2)
- We're going to make use of the fontawesome library to display our icons
- Install: `npm i @fortawesome/fontawesome-free`
- We want to show the 3 action buttons on the right hand side of each cell
- The ActionBar will be dim and when a user hovers over it does it get bright
- For the CodeCell, we want to add a bar right above the CodeCell and the ActionBar sits inside of it on the right side

### [74. Creating an AddCell component](https://github.com/sungnga/jbook-cli-app/commit/9dba849b6c3d0b8802cf931cd2cedd85510c9360?ts=2)
- The AddCell component adds a new cell to the cell list. It adds either a code cell or a text cell
- This component receives nextCellId as props
- Import the insertCellBefore action using useActions() hook
- The AddCell component renders two buttons - one is 'Code' cell and the other is 'Text' cell
- When one of these buttons is clicked, the insertCellBefore() action is dispatched and it takes the nextCellId and the type of 'text' or 'code' as arguments
- This will insert either a code cell or a text cell to the cells array depending on the cell type given

### [75. Displaying AddCell component in CellList component](https://github.com/sungnga/jbook-cli-app/commit/d36555fd7ef8cdc70935ddde3c646512d3a73f15?ts=2)
- Inside of the CellList component is where we render each cell in a CellListItem component. And for each cell being rendered, we want to display our AddCell component just above it
- And then at the bottom of the cell list we want to render the AddCell component once more, but the nextCellId is set to `null` because we don't have a nextCellId as this is the end of the cell list
- We need to update our cell id type to be able to accept `null` as well

### [76. Styling the AddCell component](https://github.com/sungnga/jbook-cli-app/commit/5b66e6157d770c81f6ad2bafce6934584403f089?ts=2)
- We want the two buttons to be in the middle of the screen and a line is drawn through, but is behind, the two buttons
- Style the buttons to have rounded corners and include a plus icon on the left side
- We don't want to show the AddCell buttons initially until a user hovers over it

### [77. Forcing AddCell visibility on CellList](https://github.com/sungnga/jbook-cli-app/commit/46c940150de253fa2be8c9a4e3cec64ddb202626?ts=2)
- When there is no cell left in the CellList we want to make sure that the AddCell is always visible to the user
- Add a forceVisible props to AddCell Component and make the props optional by adding a question mark next to it in the interface definition

### [78. Adding vertical spacing between AddCell bar, add transition](https://github.com/sungnga/jbook-cli-app/commit/bad32ce20b48fccd6b478ad5dbac01c9fa069df0?ts=2)
- Right now our AddCell component is squished right next to the vertical resizer handle and we're not able to resize the CodeCell vertically. We can apply some vertical margin between the AddCell
- Also, apply additional transition properties to the AddCell component so there will be a little longer delay before the user sees the AddCell when they hover over the area

### [79. Fixing AddCell behavior: refactoring the Redux side](https://github.com/sungnga/jbook-cli-app/commit/f63cc77d3cc552b8c4383d195be436f5330bd207?ts=2)
- We want to modify the way a new cell gets added to the end of CellList
- If there is no cell in CellList, add the new cell at the beginning (unshift method) of cells array, instead of at the end (push method) of the array
- If there is cell in CellList, add the new cell AFTER the foundIndex cell, instead of before the foundIndex cell
- Change the name of action type from `INSERT_CELL_BEFORE` to `INSERT_CELL_AFTER`

### [80. Fixing AddCell behavior: refactoring the React side](https://github.com/sungnga/jbook-cli-app/commit/93fa1a0f0bdbca8b8bf26683b38405842abc0dfd?ts=2)
- The behavior we're trying to fix: when we click on the AddCell at the bottom of CellList, a new cell is inserted and the AddCell component that we clicked on get shifted down the CellList in the DOM. At the same time, this last AddCell component is visible for a moment and then just disappears
- So in general, when inserting an item into a list, it's best practice to insert it after instead of before. This way it doesn't generate this weird behavior


## CONNECTING BUNDLES IN REDUX

### [81. Defining bundling action types and interfaces](https://github.com/sungnga/jbook-cli-app/commit/da85490797fec332f07601d1571cb202913d234b?ts=2)
- The two action types for our bundling process are: BUNDLE_START and BUNDLE_COMPLETE
- Define interfaces for both action types
- When our BundleCell action creator starts, it's going to dispatch the BundleStartAction. It will take a cellId as an argument. At this stage we may show a loading icon while the use's code is bundling
- Once the code has been bundled, the BundleCell action creator will dispatch the BundleCompleteAction. This action takes in a payload of the cellId and the result of the bundling process which contains the code and err properties

### [82. Adding the bundlesReducer](https://github.com/sungnga/jbook-cli-app/commit/19ba6aeb0fc9d5ef99a8df50c86624ed0da0d567?ts=2)
- The bundlesReducer function handles the implementations of both BUNDLE_START and BUNDLE_COMPLETE action types. It updates the bundles state in the store according to the action type being called
- The bundlesReducer manages the bundles state in Redux store. The bundles state properties are:
  - loading: boolean
  - code: string
  - err: string
- Wire up the bundlesReducer function to the combineReducers() call

### [83. Adding the createBundle action creator](https://github.com/sungnga/jbook-cli-app/commit/f1f1743f6bbb886987c9c8c207f635585fcbdb87?ts=2)
- The createBundle action creator...
  - takes in some amount of user's code and a cellId: input and cellId
  - returns a function. This function...
  - dispatches the BUNDLE_START action with a payload of cellId
  - starts the bundling process: asynchronously calling the bundle() function with the given input. Stores the bundle result in result variable
  - then dispatches the BUNDLE_COMPLETE action with a payload of cellId and bundle object which has the result code and err properties
- Because we are dispatching two actions from one action creator and because we're having asynchronous code (bundling process is asynchronous), we're going to make use of Redux thunk

### [84. Wiring up to React](https://github.com/sungnga/jbook-cli-app/commit/e683e3fbfd70769a22ddf1bc87f4517f37495dc1?ts=2)
- Now we can wire up the bundles state in Redux store to our CodeCell component
- In the CodeCell component:
  - We no longer need the code and err states anymore. Now the output code and the err value is going to be stored in Redux store. Also, we are no longer doing the bundling inside of this component. Instead, we call the createBundle() function to do the bundling
  - Call useTypedSelector() hook to access the Redux store and we specifically want to access the bundles state and look up for a particular bundle based on the given cell.id. Remember that there could be many bundles being process and each bundle has a cellId attached to it
  - For rendering the Preview component, it now gets the code props from `bundle.code` and the err props from `bundle.err`. The bundle.code contains the bundled code to be executed by the Preview component and display on the preview window. If there's an error in `bundle.err`, it will display the error message instead

### [85. Solving infinite calls on createBundle with useMemo hook](https://github.com/sungnga/jbook-cli-app/commit/935974f378bface8003b287e3c8b4529f48d923e?ts=2)
- Since we're calling the createBundle action creator inside the useEffect hook, the CodeCell component keeps re-rendering itself and this causes the preview window to keep reloading
- To solve this issue we make use of the useMemo hook from React

### [86. Getting an initial bundle](https://github.com/sungnga/jbook-cli-app/commit/7a049cefadb264d3ea068c7f791028ff50f467f0?ts=2)
- When the CodeCell component loads for the very first time, the bundles state in Redux store is empty and loading is set to true
- So when CodeCell component first loads and there's no bundle, we want to call createBundle() to create a bundle right away. This will cause the preview window to render immediately instead of one second later
- Only when a user engages with our code editor will we wait for one second before calling createBundle() to start the bundling process. Since createBundle() is called inside useEffect hook, this function runs when one of the items in dependencies array changes i.e., when cell.content changes

### [87. Showing a loading progress bar icon](https://github.com/sungnga/jbook-cli-app/commit/8773248d6ccdcfc795f4a2ac9603db7a2ca188d6?ts=2)
- We want to show a progress bar icon over the preview window if no content in bundle state or if bundle.loading is true

### [88. Fixing Preview window background](https://github.com/sungnga/jbook-cli-app/commit/97a55203148c420225402564ba606de8047ed2f5?ts=2)
- In our CodeCell component, whenever we rebundle our code, the Preview window flickers for a moment with a dark background before it renders the white background. This occurs because of the way we apply the css animation rules to the progress bar to delay for .25s. The dark background displays during this .25s delay
- To fix this, we wrap the preview window inside a wrapper div tag and give it a white background color. This way the background will always be white even during the rebunding process


## ADDING A 'CUMULATIVE CODE EXECUTION' FEATURE
- The next feature we want to build is to allow all code cells to reference any variable, any function, any object that is declared in a prior code cell

### [89. Calculating cumulative code in CodeCell component](https://github.com/sungnga/jbook-cli-app/commit/b95a8b7ee4e5ee0ec8213a0507bae792ad7fc59e?ts=2)
- Currently, the way our CodeCell component works is it takes the user's code from each different code cells, feeds it into the bundler and we get back a bundle for each particular cell (correspond to its cellId)
  - Also note that the bundling process itself happens on the Redux side by calling the createBundle action creator and provide it the cell.id and cell.content
  - The CodeCell component gets back a bundle by calling useTypedSelector hook and look at the bundles state inside of the Redux store
- Now, to implement our new feature, we want to add an additional step before handing off the code to the bundler - to createBundle action creator
  - This step is accumulating codes from previous code cells and join it into one code file and then pass it to the bundler
  - An example of how to calculate the cumulative code is this:
    - CodeCell#1 will have cumulative code from CodeCell#1 -> Pass cumulative code to bundler -> Bundle for #1 -> Pass bundle to CodeCell component -> Pass bundle to CodeCell component
    - CodeCell#2 will have cumulative code from CodeCell#1 join with CodeCell#2 -> Pass cumulative code to bundler -> Bundle for #1, #2 -> Pass bundle to CodeCell component
    - CodeCell#3 will have cumulative code from CodeCell#1 join with CodeCell#2 join with CodeCell#3 -> Pass cumulative code to bundler -> Bundle for #1, #2, #3 -> Pass bundle to CodeCell component
  - Calculating a new value based upon existing data in state is referred to **derived state**. Usually a good place for a derived state is inside a selector and we place these selectors inside of a component. In our case, inside of the CodeCell component, we will use a new useTypedSelector hook to generate the cumulative code values from current cell and all the previous cells
  ```ts
  import { useTypedSelector } from '../hooks/useTypedSelector';

  const CodeCell: React.FC<CodeCellProps> = ({ cell }) => {
    const bundle = useTypedSelector((state) => state.bundles[cell.id]);
    // cumulativeCode has the code from current cell plus all previous cells
    // This selector receives a state
    const cumulativeCode = useTypedSelector((state) => {
      // Reach into cells state and get data and order properties from it
      const { data, order } = state.cells;
      const orderedCells = order.map((id) => data[id]);

      // cumulativeCode is an array of strings
      const cumulativeCode = [];
      for (let c of orderedCells) {
        if (c.type === 'code') {
          cumulativeCode.push(c.content);
        }
        // If c.id is the current cell.id, we break
        if (c.id === cell.id) {
          break;
        }
      }
      return cumulativeCode;
    });

    console.log(cumulativeCode);
  };
  ```

### [90. Executing the cumulative code](https://github.com/sungnga/jbook-cli-app/commit/9990b036ff72da5e8b90bbb5ba9d1eb4fa6852db?ts=2)
- Instead of passing the cell.content to createBundle() action creator to bundle, we pass to it the joined cumulativeCode, a single string of cumulativeCode
- We've now got cumulative code execution throughout all of different code cells. If we make a change to one code cell, all the dependent code cells underneath it will automatically be updated and re-execute
- Now we're able to share variables, functions, etc. between code cells
  ```ts
	useEffect(() => {
		if (!bundle) {
			// joined by a newline character
			createBundle(cell.id, cumulativeCode.join('\n'));
			return;
		}

		const timer = setTimeout(async () => {
			createBundle(cell.id, cumulativeCode.join('\n'));
		}, 2000);

		return () => {
			clearTimeout(timer);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [cumulativeCode.join('\n'), cell.id, createBundle]);
  ```

### [91. Adding a show function](https://github.com/sungnga/jbook-cli-app/commit/5534efa9d12df5468230f0ca20ccb43dfe7bf398?ts=2)
- We're going to add in another feature to our application. We going to build a `show` function that we will be able to call and pass in some value, and it will display the content in the Preview window
- There are a variety of values that we can pass in to the `show` function
  - `show(1);`
  - `show('kdjsf');`
  - `show({});`
  - `show([1,33,56,799]);`
  - `show(<div>element</div>);`
  - `show(() => <div>{value}</div>)`
- We can now show simple values like strings, numbers, arrays and objects

### [92. Showing a JSX element, avoiding import naming collisions](https://github.com/sungnga/jbook-cli-app/commit/1acb1d6467017c234f5a179b67d4f8da429a66e1?ts=2)
- Let's update our show function to be able to recognize a React JSX element
- In our show function, we're going to automatically import the React and ReactDOM modules into every single bundle we create. The reason why we want to do this is if a user decides to show some JSX elements, they would get a runtime error unless they import a React module themselves. We can't rely on our users to figure this out for the error to go away
- However, if a user decides to write out the import statements of React and ReactDOM in the code editor, we will run into import naming collisions because we have hard-coded the same modules into our user's code
- To avoid import name collision conflict, we're going to rename our React and ReactDOM import statements and we're going to configure ESBuild to reference these instead. So whenever it sees JSX elements, it will use the renamed React and ReactDOM
  - Renaming from `import React from 'react';` to `import _React from 'react';`
  - Renaming from `import ReactDOM from 'react-dom';` to `import _ReactDOM from 'react-dom';`
- Note: ESBuild will be able to recognize that React is imported twice, but it's going to include the React source code one time to the bundling process

### [93. Showing a React component, implementing a show function no-op](https://github.com/sungnga/jbook-cli-app/commit/2cee8638c19f1765009477778fbbccb2a24ca13a?ts=2)
- To show a React component using our `show` function, a user writes it in the same way as they usually write out a simple JSX element. And they can show this component as many times as they want, or even in a different code cell
  - Example:
    ```js
    import React from 'react';
    import ReactDOM from 'react-dom';

    function App() {
      return <h1>component</h1>;
    }

    show(<App />);
    ```
- However, if a user calls show() inside a previous code cell, we do not want the results of that show() to be reflected inside of subsequence code cells

### [94. Refactor: extracting cumulative code selector into a hook](https://github.com/sungnga/jbook-cli-app/commit/f2dc4e91407e7ef1f7f4d385337a13f0ae88ebb9?ts=2)
- We want to extract the cumulative code logic into a separate hook and we can call it in CodeCell component
- The useCumulativeCode hook is going to receive a cellId as a parameter. We need to know the id of the cell we're trying to find the cumulative code for 

### [95. Adding CSS to CellList, fixing CodeCell resize odd behavior](https://github.com/sungnga/jbook-cli-app/commit/d47a86e1f9392d49852baa7cb8175a24c1059e46?ts=2)
- Let's add some margin to the sides of our CellList component. This way the cell list doesn't bleed to the edge of the browser window
- Fixing CodeCell vertical resize odd behavior of abruptly snapping shut and open 


## JBOOK APP ARCHITECTURE AND LERNA

### [96. jbook app infrastructure](https://github.com/sungnga/jbook-cli-app/commit/b09a26dc62bce4fdc7ec0dad35fef34e852dd267?ts=2)
- On a user's machine:
  - In the terminal, a user will run: `npx jbook serve`
  - Then they will see an output: `Open your browser and navigate to localhost:4050`
- On our side:
  - When a user runs that command, we're going to launch our CLI program
  - The CLI is going to start up a Local Node API server
  - The Local Node API is a small Express server. It has three tasks to perform:
    - To serve up our React application on localhost:4050.It takes our built React project files (the index.html and compiled index.js) and serves it on the user's machine
    - To write any changes that a user makes to any cells to a file on a user's machine. An example is when a user tries to save all the changes they make to a cell into a notebook.js file. We're going to send those changes from our React application over to Local Node API and the server will write that update or changes to a given cell into this notebook.js file
    - To load up that file on a user's machine and provide a listing of all the cells inside that file over to our React application (localhost:4050). That is what is going to allow a user to open up an existing notebook file and see all of those existing cells that they created in the past in their browser

### Parts of our jbook app
- **CLI:**
  - Needs to know how to start the Local Node API
  - Needs to know how to publish a notebook to the Public API
- **Local Express API:**
  - Needs to serve up the React app
  - Need to be able to save/load cells from a file
- **Public Express API: (future implementation)**
  - Needs to serve up the React app
  - Needs to be able to save/load cells from a DB
  - Needs to handle auth/permission/etc
- **React App:**
  - Needs to make its production assets available to either the local API or the public API

### Package based development
- We are going to develop and deploy each of these parts as separate standalone NPM packages
- CLI -> jbook
  - This package can easily be installed on a user's machine
- Local Express API -> @jbook/local-api
  - Contains all the code and the implementation needed to run a local API
- Public Express API -> @jbook/public-api
  - We won't be building this right now
- React App -> @jbook/local-client
  - Package up and deploy as an NPM module

### Lerna CLI
- Lerna CLI is a tool for managing Javascript projects with multiple packages. It's going to manage all the different packages we build for this project for us
- Other tools out there similar to Lerna: Yarn Workspaces, NPM Workspaces, Bolt, Luigi
- We will be using Lerna v3.22.1
- Install: `npm i -g -save-exact lerna@3.22.1`
- Lerna docs: https://github.com/lerna/lerna

### [97. Lerna setup](https://github.com/sungnga/jbook-cli-app/commit/a890ce9f8f242de025916ca9fedae7f190c68648?ts=2)
- We need to restructure our react app project folder
- The updated overall project folder will look like this:
  - lerna.json
  - packages
    - cli
    - local-api
    - local-client (our react app project)
- [Rename our current react app project](https://github.com/sungnga/jbook-cli-app/commit/37eae198db2ae706571523806ccf52606fc9c53d?ts=2) to `local-client`
  - Inside the root of jbook-cli-app folder, create a folder called `local-client`. Drag all the files into this folder
  - In .gitignore file, replace `/node_modules` with `/local-client/node_modules`
- jbook-cli-app is also the name of Github repo. Don't change the name of this root directory. Else all the commit history of this repo will be lost
- cd into jbook-cli-app directory and run: `lerna init`
  - A `packages` folder and a `package.json` file are added to the directory
- Move the `local-client` folder into `jbook-cli-app/packages` folder
- Inside `jbook-cli-app/packages` folder, create 2 new folders: cli and local-api
- cd into `jbook-cli-app/packages/cli` folder and run: `npm init -y`. This will create a package.json file
- cd into `jbook-cli-app/packages/local-api` folder and run: `npm init -y`. This will create a package.json file

### Adding modules with Lerna
- When using lerna, we do not manually `npm install` modules. Instead, we use the command `lerna add`
- We delegate any additions, removals, updates of modules to lerna. It will manage all the dependencies across our different projects
- NOTE: when adding a dependency, we need to be specific - we need to scope - which module of our projects we want to add this dependency to. If we don't add the `--scope` option, this dependency will be added to all modules and we rarely ever do it this way
- We're going to add the commander package to our `cli` module. Commander makes it easier to read in command line arguments
- Install commander to cli: `lerna add commander --scope=cli`

### [98. Linking packages](https://github.com/sungnga/jbook-cli-app/commit/7d7460977d6023e3c67bb9700796da94b4507bed?ts=2)
- For a typical and standard package/module, in its package.json file, the "main" key is set to "index.js" file. This is the entry file of a package. So if this package is required or imported by another package or program, it's going to look for this index.js file. This is what our bundler is doing when it's trying to import a package
- We want to link the `cli` package/module to the `local-api` package/module using lerna. In the `cli` package, we want it to have a dependency package of `local-api`
- Step 1: setup the local-api package
  - In `local-api` folder:
    - package.json file: `"main": "index.js"`
    - index.js file: `module.exports = () => { console.log('server is listening'); }`
- Step 2: add `local-api` package as a dependency to `cli` package
  - Run: `lerna add local-api --scope=cli`
- Step 3: require the `local-api` package and use it
    - In `cli` folder and in index.js file:
    -  `const serve = require('local-api'); serve();`
- The final setup looks like this:
  - In `local-api` folder:
    - package.json file: `"main": "index.js"`
    - index.js file: `module.exports = () => { console.log('server is listening'); }`
  - In `cli` folder:
    - package.json file: `"local-api": "1.0.0"`
    - index.js file: `const serve = require('local-api'); serve();`
- We can make changes to the `local-api` package as much as we want and we can see these changes reflected in the `cli` package immediately without any extra work. Lerna manages these packages behind the scenes
- This is the behavior we wanted from lerna. We can now change all these different packages as much as we want in the development environment and instantly see the changes reflected inside of our other projects

### [99. Adding typescript support to the local-api module](https://github.com/sungnga/jbook-cli-app/commit/0884c07a8927319fd63f0843f776597ee631f536?ts=2)
- It is not recommended to export typescript from an npm module of any kind. And the reason is the file that is trying to import/require the module might be a plain Javascript file and will not be able to read the typescript file. Instead, we need to transpile the typescript code into plain JS using the typescript compiler before exporting it from the package
- In local-api project folder:
  - Install typescript as a dev dependency:
    - `lerna add typescript --dev --scope=local-api`
  - Generate a tsconfig.js file by running:
    - `npx typescript --init` (if don't have TS installed globally)
    - Or run: `tsc --init` (if have TS installed globally)
    - Configure TS to take the transpiled typescript files and place the result inside of a `dist` directory
  - In tsconfig.json file
    - Uncomment the "outDir" line and set it to: `"outDir": "./dist",`
    - Uncomment the "declaration" line: `"declaration": true,`
  - In package.json file
    - Add in a script that's going to run the typescript compiler
    - Update the "main" key and point it to the compiled index.js file inside of dist directory. This is setting the entry point where other people can find the code of this module
    - Add in a "types" key and point it to the index.d.ts file inside of dist directory. This is telling the typescript of whoever is importing this module that the type definition file for this module can be found here
    ```js
    "main": "dist/index.js",
    "types": "dist/index.d.ts",
    "scripts": {
      "start": "tsc --watch --preserveWatchOutput",
    },
      ```
- To test out the typescript support for local-api, cd into local-api directory and run:
  - `npm start`
- Now inside of the `local-api` module, we see a `dist` folder. In it has the index.js file and the index.d.ts type definition file. The index.js file contains the transpiled code of this package in Javascript and this is what we are exporting

### [100. Adding typescript support to the cli module](https://github.com/sungnga/jbook-cli-app/commit/a9ef9991467a1829e5d130a782d0e2b262b40626?ts=2)
- In local-api project folder:
  - Rename the current index.js file to index.ts. And then change to import from local-api instead of require local-api
  - Create an src folder and move the index.ts file into here
  - Generate a tsconfig.json file in cli module
    - Run: `tsc --init`
  - Install Typescript as a development dependency
    - Run: `lerna add typescript --dev --scope=cli`
  - Configure typescript in tsconfig.json file
    - Uncomment "outDir" line and set it to "./dist"
    - We don't need any type declaration files generated because we're not going to import this cli into any other modules. So don't need to configure/uncomment "declaration" line
  - In package.json file
    - We don't need to declare the "main" key, because we don't intend to import this cli into any other modules. Delete the "main" key
    - Add a start script that's going to run the typescript compiler
      - `"start": "tsc --watch --preserveWatchOutput",`
- To test out the typescript support for cli, cd into cli directory and run: `npm start`
- We should see a `dist` folder inside the cli project folder and it has a compiled index.js file of the cli package
- To test out our cli module in Javascript form, cd into dist directory and run: `node index.js`. It should say server is listening

### [101. Running parallel start scripts with Lerna](https://github.com/sungnga/jbook-cli-app/commit/cbcafed9b775299f675cea07621e888055afa054?ts=2)
- In package.json file of the root directory (lerna's file), add a start script
  ```js
  "scripts": {
    "start": "lerna run start --parallel"
  }
  ```
- Lerna's start script is going to execute the start script inside of each different packages. Lerna is automatically going into each package and see if they have a defined start script and if they do, it's going to run them all in parallel
- Currently, we have a start script for all 3 of our projects
- To test out the parallel start script, cd into the root project directory and run: `npm start`


## CREATING A CLI

### 102. Reading command line arguments
- Our CLI is going to be a program that a user is going to run from their terminal. For example, when a user runs the command `jbook serve`, we're going to run the code inside of our cli package. Inside that package, a code is going to start up our local-api
- This CLI command also has some options/arguments for our users to use, where they can save their code cells into a file on their machine or upload their code cell file. For example, when a user runs the command `jbook serve mynotes.js`, we want to look for this file in their current directory and load this file
- This CLI command lets users to serve up on a different port instead of the default port we set. For example, serve on port 3050: `jbook serve mynotes.js --port 3050` or `jbook serve --port 3050`
- So we want to be able to read in these different command line arguments and customize our CLI program in a specific way
- We can get all of the arguments that the user types in the command line with the help of the Commander.js library
- Install commander to cli: `lerna add commander --scope=cli`

### [102. Using Commander to build a CLI](https://github.com/sungnga/jbook-cli-app/commit/d931a3a4969ffab92809efcd9dbb3db45a3e4df3?ts=2)
- In Commander library, a command describes a command that we can invoke from the command line
- The serve.ts is a file that describes what to do when a user runs the 'serve' command
- In serve.ts file, we start out with a basic command
  - Import the Command class from Commander library
  - Instantiates a new command instance
  - Calls the .command() method on 'serve'
  - Calls the .description() method that describes what this command does
  - Calls the .action() method that processes the command
- Import the serve.ts command in cli's index.ts file. This is where we assemble all the parts into an actual command line tool
- We need install the Node type definition file in `cli` project
  - `lerna add @types/node --dev --scope=cli`
- To test out our 'serve' command line tool, first run lerna's start script in root directory by running: `npm start`. Then in a separate terminal, cd into packages/cli/dist folder and run: `node index.js serve`. It should print out the serve command description that we created

### [103. Specifying command line options](https://github.com/sungnga/jbook-cli-app/commit/057ba862f32508e72590b4fb7f18a0f5a94a92d8?ts=2)
- We want to specify that it is optional to provide a filename. But we will provide a default filename of 'notebook.js'
- Inside of the .option() is where we can list out all the different possible ways to specify a port number. We will provide a default port number of 4050 if the user doesn't specify
- NOTE: our 'serve' command description and a list of options for the 'serve' command will show up in the help page by running: `node index.js serve --help` 

### [104. Communication from the CLI to the Local API](https://github.com/sungnga/jbook-cli-app/commit/31a92ad72fb499c8aaff9e4c22a7534c454bd802?ts=2)
- In the serve.ts command, the .action() function now has the filename and port number. These are the two pieces of information (plus the filename directory) we need to communicate over to the local-api
- The way we do this is, from the local-api package (in index.ts file), we're going to write out and export a function called serve(). This serve function is going to start up an Express server. The arguments to serve() function are the port that we want to run our server on, the name of the file that we want to store cells inside of, and the directory of that file
- Then we're going to import the serve function into CLI, specifically into the serve command (in serve.ts file). And call the serve function inside of the .action() callback and provide the necessary three argument values, which are the port number, the filename, and the absolute path to the filename
- Calculating the file path:
  - We need to calculate the correct path to the file and provide it to the serve function as dir argument
  - A user should be able to provide a relative path to the file that they want to save or upload, however, we need to figure out the absolute path to that file
  - We're going to import and use the path module (a Node standard library) to help us calculate the absolute path to the filename on a user's file system


## ADDING A LOCAL-ONLY API

### The goals of the Local-API module
- The local-API has three primary tasks:
  - To fetch the React app built assets and to serve up the React application in the user's browser
    - The local-api is going to be ran on the user's machine when they use our jbook application. Here, we are not running the create-react-app as it is a development server
    - The route is `GET /` to fetch built production assets (index.html or index.js files) for React app
  - Find the list of cells stored in a file (name provided to the CLI) and send those back to the browser
    - The route is `GET /cells`
    - The data to send back to the browser is an array of cell objects
  - Take the updated list of cells from the browser and store them into a file (the same file when the user ran `jbook serve` command)
    - The route is `POST /cells`

### [105. Adding dependencies and running Express in local-api](https://github.com/sungnga/jbook-cli-app/commit/3705de5ba44554caf08a3f3fdfe583d3d09446c1?ts=2)
- In local-api project folder:
  - Use the lerna command to install Express and a type definition for Express into local-api project
  - With lerna, we can only add one package at a time
  - `lerna add express --scope=local-api`
  - `lerna add @types/express --dev --scope=local-api`
  - `lerna add cors --scope=local-api`
  - `lerna add @types/cors --dev --scope=local-api`
  - `lerna add http-proxy-middleware --scope=local-api`
- Setup Express in local-api project:
  - We do all of the initial Express setup inside of the serve function
  - Create an Express app
  - Set Express server to listen on the port that is provided to the serve function
- To start up the Express local-api, we have to use our CLI that we put together
  - cd into packages/cli/dist and run: `node index.js serve`

### [106. Wrapping Express listen with a promise to catch errors](https://github.com/sungnga/jbook-cli-app/commit/9da75107679ad45f9f51cf16511397289e8505f8?ts=2)
- We want to catch any errors that generated by a specific command when a user uses our CLI command tool. For example for the serve command, if the error comes from this command, we want to display a simple error message to the user about this command that they just used
- In local-api's serve function:
  - Wrap the Express app.listen() function in a promise
  - The app.listen() will either resolve it or reject it in some point in time
  - So if we start up our server and we successfully listen on a given port, the resolve function will be called automatically and resolve our promise
  - If something goes wrong with starting up the Express server, the reject function is called and will reject our promise and put it in an error state. This will cause the try/catch block to capture the error and print out the error message
  - Now the serve function is returning a promise
- In cli's serve.ts file:
  - To catch the errors from the serveCommand, we wrap the serve function that's being ran inside of the .action() function with a try/catch statement and mark the serve function as an async function
  - If an error occurs, we print out a simple message from err.message

### [107. Displaying usable error feedback to users](https://github.com/sungnga/jbook-cli-app/commit/23e5df959d0ff985b9c8f2a952be6f66e20871fa?ts=2)
- Look inside of our err catch case, figure out what exactly went wrong, and print out appropriate error massage to the user
- In cli's serve.ts file:
  - Print an error message if the port they provide is already in use
  - Since we cannot start up the Express server we will force an exit out of our program inside the catch block
  - If they successfully start up an Express server, we may want to provide a direction of what they can do next, like navigate to the localhost of that port and start interact with the cells

### Accessing the React app
- The Express app of the local-api needs to load up our React application inside the browser. There are 2 different scenarios in which we're going to load the React app in the browser
- Scenario one is when we deployed our jbook application as an NPM package and a user installs it onto their local machine as a CLI and they run `jbook serve`. This is when we need to load up the React build files in the browser
- Scenario two is when we are doing active development of our project in create-react-app. When we make changes/updates to our react app, we want to the updates appear in the browser. So the browser, in the development environment, makes a request to the local-api and route the request over to the running create-react-app dev server to get dev the files and load it in the browser

### [108. Connecting the proxy](https://github.com/sungnga/jbook-cli-app/commit/2e92550740151760986b624caff69f1c422475e9?ts=2)
- Solution to scenario two: If we are actively developing our app on our local machine, we want to use a proxy to local create-react-app dev server
  - We're going to make a proxy inside of the local-api. Whenever we receive a request from the browser that is not a request to fetch a list of cells or a request to save a list of cells, then we will assume it's a request to the create-react-app dev server and get some development files
  - So we're going to proxy that incoming request over to localhost:3000, which is where our react application is running
  - This proxy is going to forward the request over, get the dev files from create-react-app dev server, and send back the response back to the browser automatically
  - This proxy is going to be implemented with the package http-proxy-middleware that we already installed in the local-api project 
  - After we created the Express app, we wire up this proxy middleware and configure this proxy
  - In local-api's index.ts file:
    ```ts
    import { createProxyMiddleware } from 'http-proxy-middleware';

    const app = express();

    app.use(
      createProxyMiddleware({
        target: 'http://localhost:3000',
        ws: true, //enable web socket support. Listen for changes in react app
        logLevel: 'silent' //turn off all logs of incoming requests
      })
    );
    ```
- Now when we visit localhost:3000 and localhost:4050, we see our react application is running in both browsers
  - Make sure to run lerna's start script and
  - Run `node index.js serve` command line in cli/dist directory

### [109. Building a production bundle and serving it via local-api](https://github.com/sungnga/jbook-cli-app/commit/f10185ac8d40016fcb971c820e4f124b08d0824c?ts=2)
- Solution to scenario one: If we're running the React app on a user's machine, we want local-api to serve up the built files from `build` directory
  - In this scenario, there is no create-react-app server. All we have access to are the built React files (index.html and index.js)
  - To get the build production version of the React files, cd into the packages/local-client directory and run: `npm run build`
  - Now inside of packages/local-client project we see a `build` folder. This folder contains all of the React production assets
  - Essentially, we want the contents in this `build` folder be available to the local-api package. The local-api can then serve up the contents of this folder
  - To do this, we will first need to link up the local-client package to the local-api package. In the local-api package, we will add the local-client package as a dependency, just the way we added the local-api package as dependency to the cli package
    - Run: `lerna add local-client --scope=local-api`
  - By adding local-client package as a dependency, the local-api now has direct access to the React app's `build` folder (in node_modules/local-client/build)
  - Then we will make use of Express's static middleware. This middleware will automatically serve up all files in a directory. We call the static middleware and pass to it as an argument, the absolute path to the directory where we want it to serve
  - In local-api's index.ts file:
    ```ts
    import path from 'path';

    const app = express();

    // Applies Node's path resolution algorithm to
    // figure out the absolute path to index.html file
    // local-client/build/.. is inside of node_modules folder
    const packagePath = require.resolve('local-client/build/index.html');
    // path.dirname() will give us everything up to build folder
    // excluding the index.html file
    app.use(express.static(path.dirname(packagePath)));
    ```

### [110. Determining our execution environment](https://github.com/sungnga/jbook-cli-app/commit/80af82108494c23b5801ddccc8cfca4f045fe4c0?ts=2)
- In local-api's index.ts file, we're going to add a 4th argument to the serve function, a boolean `useProxy` argument
  - Write an if statement to check if useProxy is true
  - If it is, use proxy to local CRV dev server
  - Else, serve up built files from build directory
- Then inside of our CLI, we need to ask this question: Are we on our local machine (running dev mode) or are we in production (running on a user's machine)? This will decide how we serve up our React app in the browser
- We're going to look at `process.env.NODE_ENV` variable. NODE_ENV is traditionally set to be a string of development, testing or production. We can use this environment variable to decide what environment we are in
- In cli's serve.ts file:
  - Add a `process.env.NODE_ENV` variable and set it to the string 'production' and assign its value to `isProduction` variable
  - In the serve() function, pass in `!isProduction` as a 4th arg. This means we're in local development mode and using proxy to serve up the React app in the browser
- Eventually when we deploy our CLI package to NPM registry, we will add in a script to check for all `process.env.NODE_ENV` variables and reference it to 'production'. This will ensure that a user cannot alter the NODE_ENV variable

### [111. Creating the cells router](https://github.com/sungnga/jbook-cli-app/commit/9312cf8c6ab8ef16bed15975564a80a6f34b6b04?ts=2)
- Now we're going to work on the other two tasks of the local-api package, which are to retrieve a list of cells out of a stored file and add a list of cells into an existing file
- Write a createCellsRouter function and use Express's router object to create the GET method router and the POST method router
- In Express app, call the createCellsRouter() function and pass in the filename and dir as arguments

### [112. Writing cells to a file](https://github.com/sungnga/jbook-cli-app/commit/6e937064a5544a5d4496ed8dbd7dee6977d91446?ts=2)
- We're going to use the fs module that's included in the Node standard library to write cells to a file on a user's machine
- If we import the fs module from fs/promises library, we can make use of async/await instead of callbacks
- Take the list of cells from the request object and serialize them. Then write the cells into the file 
- Provide the absolute path to the file to be written to

### [113. Reading file contents](https://github.com/sungnga/jbook-cli-app/commit/c8f815432ab349ecab8f34a33c725ef490e11072?ts=2)
- We're going to read the file from a user's machine using fs module, parse a list of cells out of it, and send the cell list back to the browser
- Use a try/catch statement to catch the read file error
- If the file doesn't exist, we're going to create a file and add default cells to it 


## DATA PERSISTENCE

### [114. Adding fetch cell logic to Redux](https://github.com/sungnga/jbook-cli-app/commit/1f0165d186fa9a002f62be9e7384da2e891dad59?ts=2)
- We're going to be adding in a couple of actions (action types and action creators) to save cells and fetch cells in our Redux
- The process of fetching cells when our app first starts up:
  - App starts up - when a user visits localhost:port#
  - Start fetching cells from the API
  - Dispatch action to flip 'loading' to true
  - Make request to API
  - Dispatch action to set the list of cells or err
- First, we're going to add in the ability to fetch a list of cells from our API
- Define 3 fetch cells action types and action interfaces

### [115. Adding fetch cells action creator](https://github.com/sungnga/jbook-cli-app/commit/c33e272b2feb3b6fa02faf63881a6c26119c08d2?ts=2)
- We're going to use axios to make our network request
- The fetchCells action creator goes through the process of fetching cells:
  - Dispatches the FETCH_CELLS action type
  - Makes the request using axios in a try/catch statement
  - If it gets back the data, dispatch the FETCH_CELLS_COMPLETE action type with a payload of the data that it got back from the request
  - If it gets back an error from the request, dispatch a ETCH_CELLS_ERROR action type with a payload of the error message

### [116. Handling fetch cell types](https://github.com/sungnga/jbook-cli-app/commit/12ecec610d6f524cb164a21a5f71d880ea2ea22c?ts=2)
- Handle the three fetch cell types inside the cells reducer function

### [117. Saving a list of cells](https://github.com/sungnga/jbook-cli-app/commit/aca4ffe8ab63518064dc7583729f72418d812fb1?ts=2)
- Save a list of cells to our API
- Process of saving cells:
  - User changes something in their notebook
  - Combine together 'data' and 'order' properties in action creator into a 'cells array'
  - Make request to API to persist that list of cell
  - Dispatch action if something went wrong
- We only need to define one action type and interface for saving cells
- Add in a saveCells action creator
- Handle the save cells error type inside the cells reducer function

### [118. Calling fetchCells in CellList component](https://github.com/sungnga/jbook-cli-app/commit/8990cf6e14ba9fc91f46ab07cc9b4fffa46da594?ts=2)
- Whenever we're about to show the CellList component on the screen, we want to call the fetchCell action creator
- To get access to an action creator inside a component, call useAction() hook
- We want to make sure that we only call fetchCell action creator when the CellList component first renders to the screen. So we call it inside of the useEffect() hook

### [119. Saving a list of cells with saveCells middleware](https://github.com/sungnga/jbook-cli-app/commit/c5ddb0b67f10b1c1202e7527d0f27d1986ab6bb1?ts=2)
- With our current setup in CellList component, we don't want to call saveCells() whenever a user makes a change to the cells array. We don't want to trigger the saveCells() function for every single key press in the code editor or text editor
- Instead, we need to create a saveCells/persist middleware that will watch for certain action types that modify the list of cells that are stored inside of the cells state. These action types are:
  - MOVE_CELL
  - UPDATE_CELL
  - INSERT_CELL_AFTER
  - DELETE_CELL
- If the persistMiddleware detects the incoming action matches with one of these action types, it will dispatch the saveCells() action creator to save the list of cells

### [120. Adding debouncing save logic](https://github.com/sungnga/jbook-cli-app/commit/fda40061d93a9e51f6d2b9ad2fc9296161f12885?ts=2)
- Right now we are able to save a list of cells, but we are saving with every single key press. So to limit the number of requests we make we're going to add in some debouncing logic
- Inside of the persistMiddle function, wrap the saveCells() function inside of a setTimeout() function. This allows us to call the saveCells() function after a certain amount of time
  - If another action is dispatched during that amount of time, we clear the timer and reset it


## PUBLISHING TO NPM

### [121. Getting ready to deploy](https://github.com/sungnga/jbook-cli-app/commit/98e2580c5878ab2312b1915e2d5d472ebf1e8d7e?ts=2)
#### The steps:
**1. Create a new organization at NPM Registry**
  - Sign into your npm account at npmjs.com
  - Click on the profile menu icon and select "Add Organization"
  - Create an npm organization and this name must be unique to NPM Registry
  - Then click on the "Free" Unlimited Packages button

**2. Make sure our package name is unique**
  - Inside cli/package.json file:
    - The "name" key must be unique to NPM registry: `"name": "jsnotebook-cli",`
  - Inside local-api/package.json file:
    - The "name" key is: ` "name": "@jsnotebook-cli/local-api",`
    - This package is considered a scope to the cli package
  - Inside local-client/package.js file:
    - The "name" key is: `  "name": "@jsnotebook-cli/local-client",`
    - This package is considered a scope to the cli package

**3. Refactoring package names**
  - We need to refactor the package names that we use as dependencies between the cli, local-api, and local-client packages
  - Instead of calling `local-api` and `local-client`, we need to call them `@jsnotebook-cli/local-api` and `jsnotebook-cli/local-client` anywhere in our project where we link one of these packages
  - In cli/package.json file:
    ```json
    "dependencies": {
      "commander": "^7.1.0",
      "@jsnotebook-cli/local-api": "^1.0.0"
    },
    ```
  - In packages/cli/src/commands/serve.ts file:
    - Update the import for 'local-api' in serve command
    - `import { serve } from '@jsnotebook-cli/local-api';`
  -  In local-api/package.json file:
    ```json
    "dependencies": {
      "cors": "^2.8.5",
      "express": "^4.17.1",
      "http-proxy-middleware": "^1.0.6",
      "@jsnotebook-cli/local-client": "^0.1.0"
    }
    ```
  -  In local-api/src/index.ts file:
    - Update the `require.resolve()` function
      ```ts
      const packagePath = require.resolve(
        '@jsnotebook-cli/local-client/build/index.html'
      );
      ```
  - Lastly, run: `lerna bootstrap` to relink all the different packages
  - To make sure that everything is still working properly,
    - at the project root directory, run: `npm run start`. This will start up our two typescript compilers and create-react-app server. The project is served on localhost port 3000
    - cd into packages/cli/dist/ directory and run: `node index.js serve`. The project is served on localhost port 4050

**4. Specify which files should be sent to NPM when we publish**
  - Inside packages/cli/package.json AND packages/local-api/package.json files:
    - Add a "files" key. It's a string array that contains the name of the directory
      ```json
      "files": [
        "dist"
      ],
      ```
  - Inside packages/local-client/package.json file:
    - Whenever create-react-app builds our project, the output is put inside the 'build' directory. So we want to say that we want to publish everything inside the 'build' folder
    - Add a "files" key
      ```json
      "files": [
        "build"
      ],
      ```

**5. Split our 'dependencies' and 'devDependencies'**
  - Move any dependencies in the "dependencies" to the "devDependencies" list if we don't intend to publish them
  - In packages/cli/package.json file:
    - We only need typescript and @typescript/node during development so we don't need to publish those dependencies
    ```json
    "dependencies": {
      "commander": "^7.1.0",
      "@jsnotebook-cli/local-api": "^1.0.0"
    },
    "devDependencies": {
      "@types/node": "^14.14.35",
      "typescript": "^4.2.3"
    }
    ```
  - In packages/local-api/package.json file:
    ```json
    "devDependencies": {
      "@types/cors": "^2.8.10",
      "@types/express": "^4.17.11",
      "@types/node": "^14.14.35",
      "typescript": "^4.2.3"
    },
    "dependencies": {
      "cors": "^2.8.5",
      "express": "^4.17.1",
      "http-proxy-middleware": "^1.0.6",
      "@jsnotebook-cli/local-client": "^0.1.0"
    }
    ```
  - In packages/local-client/package.json file:
    - Remember that when a user installs our CLI onto their machine, they're not going to be running create-react-app at all. Once the local-client package is installed on the user's machine, its purpose is to serve up the different files and folders inside the 'build' directory. So we don't need any dependencies at all when we install the local-client onto the user's machine
    - Replace/rename the "dependencies" key to "devDependencies" key. This way all the dependencies that we've been using are now devDependencies

**6. Set our package to be publicly accessible**
  - Inside packages/cli/package.json, packages/local-api/package.json, and packages/local-client/package.json files:
    - Add a "publishConfig" key. It's an object and put in it `"access": "public"`
    ```json
    "publishConfig": {
      "access": "public"
    },
    ```
  - Now anyone can install this package onto their machine

**7. If building a CLI, configure the file to run**
  - We need to configure the file we want to run whenever a user tries to run our package directly from the terminal
  - Inside packages/cli/package.json file:
    - Add a "bin" key and specify which file we want it to run. Usually it's going to be the `"dist/index.js"` file
    ```json
    "bin": "dist/index.js",
    ```
  - In addition to this, we need to add a configuration to the main index.ts file (in packages/cli/src/index.ts) of the package
    - Add this at the top of the file: `#!/usr/bin/env node`
    - This will allow us to directly execute this file without typing out `node index.ts`

**8. Add a 'prepublishOnly' script**
  - When we run 'npm publish', if a 'prepublishOnly' script is defined, NPM will execute this script first
  - Inside this 'prepublishOnly' script, we can say that we want to build this package. This will ensure that we will always deploying the latest version of the package
  - Inside packages/cli/package.json  AND packages/local-api/package.json files: 
    - Inside the "scripts" object, add in a `"prepublishOnly"` key and set it to `"tsc"`. This will run the project using the "start" script, which is right above it
    ```json
    "scripts": {
      "start": "tsc --watch --preserveWatchOutput",
      "prepublishOnly": "tsc"
    },
    ```
  - Inside packages/local-client/package.json file:
    - Add this to the "scripts" object: `"prepublishOnly": "npm run build"`

**9. Bundling our CLI package using ESBuild**
  - The idea is whenever a user installs our project onto their machine by running either `npm install -g jsnotebook-cli` or `npx jsnotebook-cli`, we want the downloading process to be as fast and as small as possible. So instead of downloading all the dependencies and packages for the CLI project to work, they will download a small amount of Javascript and be able to see the project running right away. We can achieve this by applying the ESBuild onto our cli package to bundle up our entire CLI project
  - Right now the "start" script inside the cli package only compile our typescript files. In addition to this, we also want to add the bundling process using ESBuild during build time
  - So the steps is to first install ESBuild package into the cli package. We'll make use of lerna to add in a package to only cli. Secondly, we can replace the ENV variable that we defined earlier in commands/serve.ts file with the string `"production"`
  - cd into packages directory and run:
    - `lerna add esbuild@0.8.27 --exact --dev --scope=jsnotebook-cli`
    - This is a dev dependency and we want to scope it to the cli package. The "name" field in package.json file is where we find the name of the package we want to scope
  - Inside packages/cli/package.json file:
    - Add the esbuild script to run inside the "prepublishOnly" script field
    ```json
    "scripts": {
      "start": "tsc --watch --preserveWatchOutput",
      "prepublishOnly": "esbuild src/index.ts --platform=node --outfile=dist/index.js --bundle --minify --define:process.env.NODE_ENV=\\\"production\\\""
    },
    ```
  - To test to see if the bundling process is working,
    - cd into packages/cli directory and run: `npm run prepublishOnly`
    - What this does is ESBuild generates a bundle of our entire CLI project during development time and stores the bundle content in packages/cli/dist/index.js file. It includes the express package, the commander package, and local-api package. Although it doesn't include the local-client package and that's because we're not importing anything from local-client
  - One last thing we can do to clean up our code is, inside packages/cli/package.json file:
    - move the `@jsnotebook-cli/local-api` and `commander` dependencies to the "devDependencies" section. We no longer need to import these two dependencies since it's already included in the bundling process
    - However, we still need to include the `@jsnotebook-cli/local-client` package in the "dependencies" section
    ```json
    "dependencies": {
      "@jsnotebook-cli/local-client": "^1.0.0"
    },
    "devDependencies": {
      "@types/node": "^14.14.35",
      "@jsnotebook-cli/local-api": "^1.0.0",
      "commander": "^7.1.0",
      "esbuild": "0.8.27",
      "typescript": "^4.2.3"
    }
    ```

**10. Commit to git**
  - In the root directory, run: `git init`
  - When we use create-react-app to create our project, create-react-app automatically create a .git repo for us. We want to remove this .git
    - cd into packages/local-client and run: `rm -rf .git`
  - Inside the root directory again, create a .gitignore file and add in it: `build`, `dist`, and `node_modules`
  - Run: `git add .`
  - Run: `git commit -m "Initial commit"`
  
**11. Publishing to NPM with lerna**
  - We're now ready to push all of our packages to NPM
  - In the root directory, run: `lerna publish --no-push`
  - The `--no-push` flag is to make sure that lerna doesn't push our code to some remote such as github or gitlab
  - In the terminal it will ask us to select a version. Select the `Major` option
  - Then type `Yes` to the question, Are you sure you want to publish these packages?

#### Once the project is published:
- To download the jsnotebook-cli package onto a local machine, run: `npx jsnotebook-cli serve`
- To install the package globally, run: `npm install -g jsnotebook-cli serve`
- The project should be served on localhost port 4050



## JAVASCRIPT TRICKS

#### Generating random ids or unique ids
```js
function randomId() {
	return Math.random().toString(36).substr(2, 5);
};
```