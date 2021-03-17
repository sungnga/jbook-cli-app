## Steps to building this app
The codebase for each step can be found in the commit link

## IMPLEMENTING IN-BROWSER BUNDLING

### Project setup
- Create project with create-react-app
  - `npx create-react-app jbook-cli-app --template typescript --use-npm`
- Install esbuild package
  - `npm i --save-exact esbuild-wasm@0.8.27`
  - ESBuild will allow us to transpile and bundle our code in the browser
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
- We want to intercept this step and provide it the path to the module ourselves. We intercept this process with the help of unpkg-path-plugin
- The unpkg.com site will automatically return the path of a given NPM module. This path is usually found in the index.js file of the module
- In the unpkg-path-plugin.ts file, we overwrite the ESBuild's .onResolve() and .onLoad() functions
- For now we're just going hard-code in the import module just to test that the ESBuild bundling works


## DYNAMIC FETCHING & LOADING OF NPM MODULES

### Dynamically fetching modules
- If we try to fetch a file with a path besides index.js (usually as the entry point to a given module), then we make a request with axios to args.path(url). And this should give us back the contents of whatever file is at that url
- Then we want to take the data we've fetched, the contents of that file, and return an object from onLoad(). This object contains the contents that the ESBuild is trying to get of the file by accessing the file system. And we're providing it the contents here

### Generating the unpkg URL using the URL constructor
- The URL constructor will generate a url object, but we only want the href property inside of it. The href property has the fully form url
- This is still a naive approach to generating a path which doesn't work in all possible cases

### Resolving nested paths
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

### Setup defines during bundling
- ESBuild define docs: https://esbuild.github.io/api/#define
- Define allows us to define a value inside of code whenever we are doing a bundling process
- When bundling we get a warning message
  - `warning: Define "process.env.NODE_ENV" when bundling for the browser`
- We need to setup ESBuild to define the value of "process.env.NODE_ENV" whenever we're doing a bundling
- We do the bundling in the ref.current.build() method and this is where we can include the `define` property


## CACHING FOR BIG PERFORMANCE GAINS

### Implementing a caching layer
- Whenever the onLoad function is about to make a request to unpkg.com, we want to implement a caching layer. In this cache object, we want to see if we have fetched that package before. If so, return it immediately. Otherwise, make the request and store the response inside the cache, and then return the response off to onLoad
- onLoad -> cache object -> unpkg.com
- We don't want to store our cache data in localStorage, because it maybe contain a lot of data and may potentially get deleted out of localStorage
- An alternative method of storing information inside the browser is indexedDB. Similar to localStorage, it's an information store that we can make use of inside the browser and can store much more information than localStorage
- We're going to use a helper library called localforage to help us work easier with indexedDB. It falls back on localStorage if the user's browser doesn't have indexedDB or WebSQL support
- Import: `npm i localforage`
- Caching with key-value pairs in the onLoad function after we made a request and fetched the data
  - The key is the path.args and the value is the return object from onLoad

### Fixing a Typescript error while caching

### Bundling user input
- Up until this point we have been hard-coding in the contents value for the index.js file, on which we specified as the entryPoints to tell ESBuild to start the bundling process there
- Now we want the value for this contents to come from the input state instead. This is the value that the user types into the textarea input field and we store it in input state. For example, the user may type in `const a = 1; console.log(a);`
- We need to communicate this value stored in input state to our plugin. In the `plugins` property, pass in the input state to the unpkgPathPlugin() method as an argument
- The unpkgPathPlugin function in the plugin file should receive the inputCode value as a parameter. Then in the onLoad function, if args.path is equal to index.js, we provide that value to the `contents` property
- So when a user submits a piece of code, ESBuild should be able to bundle that code

### Refactoring by breaking up resolve logic with filters
- We can define multiple different onResolve functions and use the filter to control the way in which we actually resolve a path rather than these if statements  

### Refactoring to multiple plugins
- Let's take the all the logic code around onLoad and extract it into a separate second plugin file. This will make it easier for us to understand all the different plugins inside of our project and it will make it easier to reuse these plugins in the future as our project grows
- Import the second plugin file in the main index.tsx file and then call the plugin method inside the plugins array

### Loading CSS files
- Docs for loading CSS files: https://esbuild.github.io/content-types/#css
- Whenever ESBuild does some bundling, if we import CSS, ESBuild is going to output two separate files. The first containing all the JS code and the second containing all the CSS. In a normal circumstance, ESBuild will write these two output files to a file system. However, in our app, we don't have a file system for ESBuild to write to. We will get an error when we import a CSS file, even though we successfully able to fetch the CSS data from unpkg.com
- One work-around is to inject the CSS data into a JS code snippet and insert it in the head tag of the browser DOM
- If the fileType is `css`, then we use this JS code snippet as contents property. Otherwise, use the data that we get back from the request as contents 

### Refactoring onLoad with load filters
- We want to create different onLoad functions to handle different file types
- We want to handle the index.js file, the CSS files, and any other arbitrary files

### Extracting common caching logic
- Let's extract the duplicated caching logic into its own separate onLoad function. If we already have the fetched file cached in indexedDB, then we're just going to return the cachedResult

### A better way of loading WASM
- Previously, the way we load the esbuild.wasm (web assembly binary) file into our browser is by dragging the file into the public directory of our project. We've been hosting this web assembly ourselves in the public directory
- A better approach is to provide a link of the web assembly binary that is hosted on unpkg.com
- So whenever we start up ESBuild it'll go fetch the web assembly binary from unpkg.com instead
  - `wasmURL: 'https://unpkg.com/esbuild-wasm@0.8.27/esbuild.wasm'`


## SAFELY HANDLING UNTRUSTED CODE EXECUTION

### Considerations around code execution
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

### Direct access between frames
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

### Executing iframe using srcDoc
- Create an html string that contains a script tag and in the script tag contains the code state. The code state contains the bundle code generated by ESBuild of our user's code
- Assign the `srcDoc` property of the iframe element to this html string
- Set the `sandbox` property to allow the iframe to run scripts

### Passing code to the iframe
- Even though we disabled direct communication between frames, we can still have some indirect communication between frames using addEventListener. The parent document can listen for some message from the child frame and vice versa
- When a user submits their code -> we're going to bundle that code -> we're going to emit an event down to the iframe -> the iframe should receive that event and that event should contain all of our code -> the iframe can then execute that bundle code by calling eval() on event.data -> the result would be displayed in the iframe

### Highlighting errors in iframe
- If an error occurs while iframe executes the user's code, we not only want to display the error in the browser console, we also want to display the error message in the iframe. This way the user can see what just went wrong even if they don't have their development console open
- We style the error message in red color

### Resetting the iframe contents
- Let's say a user enters in some code and submits it, and then they add/delete more code or edit existing code and submit again. Now, we want to ensure that *each time before* a user's code get executed again, that it resets/reloads the entire iframe html document to its original state. It does a full refresh of the contents of the iframe
- This way a user will always have a very consistent environment and to make sure that we don't get any leakage of variables or states between different executions of their code
- To do this, right before we start the bundling process, we're going to update the `srcdoc` property of the iframe manually. We set the iframe.current `srcdoc` property to the html string that we created for the iframe html doc
- To test this out that the iframe html doc has been reset:
  - First enter in: `document.body.innerHTML = '';`
  - This empties out the body tag and also removes our root id
  - Then enter: `console.log(document.querySelector('#root'));`
  - We should get back a div tag that contains a root id


## DISPLAYING A CODE EDITOR IN A REACT APP

### Displaying a code editor
- We are going to use an open source browser-based code editor called Monaco Editor. It will give us an almost-perfect editing experience such as syntax highlighting, autocomplete, code linting, etc.
- Install: `npm i --save-exact @monaco-editor/react@3.7.5`
- monaco-editor/react docs: `https://www.npmjs.com/package/@monaco-editor/react`

### Configuring the Monaco Editor
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

### Setting the initial value for Editor
- When a user opens our application, we want to display an initial value inside of the code editor. It can be anything
- We need to define a CodeEditorProps interface for our CodeEditor component to be able to receive props

### Handling Editor change events
- We want to update the value of input state in our App component whenever there's a change inside the Editor
- So we add an onChange props to the CodeEditor component and add a callback to call the setInput() to set the input state with the value coming from the code editor

### Adding a type definition to editorDidMount props
- We need to manually import the EditorDidMount type definition file to add a type to the editorDidMount props in MonacoEditor component
- Now that we added a type definition to MonacoEditor, we can update the editor's tab size to 2 instead of 4

### Adding prettier to our Editor
- Install prettier and its type def file: `npm i prettier @types/prettier`
- When a user clicks on the Format button, they will get automatic code formatting to their code. We specify what will get formatted
- We use useRef() hook to reference the monacoEditor instance. We call .getValue() on it to get the value in the Editor. We format the value using prettier library. Then we call .setValue() on the editorRef to set the formatted value back in the Editor

### Adding Bulma CSS library, floating the Format button
- We're going to use Bulma CSS library to style our Editor and our project in general. We're going to use the bulmaswatch library because it has some extra features in it
- Install: `npm i bulmaswatch`
- We will apply the `superhero` theme to the overall look of our app
- Add CSS styles to the Format button
- Place the Format button inside of the Editor and only show the button when the user mouses over the Editor. And if the user is not in the Editor, we want to hide this button

### Fixing syntax highlighting
- Although the Monaco Editor knows what JSX is, it doesn't apply syntax highlighting to it
- We will be using two external libraries to help us out
- Install: `npm i --save-exact monaco-jsx-highlighter@0.0.15 jscodeshift@0.11.0 @types/jscodeshift@0.7.2`
- We will overwrite the default CSS styles of the syntax highlighter library with our own custom CSS


## HOW TO EXTRACT REUSABLE COMPONENTS

### Refactoring out a Preview component
- We're going to extract all the code inside the App component that is related to an iframe that receives the bundle code, executes it, and displays the result into a separate component. The component is called Preview
- The Preview component receives a code as props from the App parent component
  - Define a PreviewProps interface and set it in the Preview component. This way any other components that use the Preview component must satisfy its condition
- Import the Preview component in the App component. Render the Preview component and pass down to it the code state as code props

### Extracting bundling logic
- Next we're going to exact code related to ESBuild bundling out of the App component into a separate file
- The asynchronous bundle function:
  - Takes a rawCode (from the input state in App component) as an argument
  - Checks to see if an ESBuild service has been started. If it hasn't, initialize a new service
  - If it has, then start the bundling process by calling service.build()
  - Returns the bundled result
- Import the bundle function in App component. When the user clicks the Submit button, the bundle function gets called with the input state as an argument. Once we get the back the bundled output, call setCode() to store it in code state

### Refactoring for multiple editors and preview windows
- We may only have one App component, but we may have multiple code editors and multiple preview windows generated in our project. We may want to wrap our CodeEditor component and Preview component inside a more generic component called CodeCell component
- Now we have a way to reuse a component that contains a single code editor and a single preview window
- Import the CodeCell component in App component and we can render this component as many times as we want


## DRAGGABLE RESIZING COMPONENTS

### Adding resizable panes with React-Resizable library, setting up
- Each CodeCell component has a CodeEditor component and a Preview component. They should display next to each other. We want to have a resize handle that allows us to drag from left to right to shrink/expand both the editor and the preview window. We want a second resize handle at the bottom of the CodeCell to expand/shrink both of the editor and preview window at the same time
- We're going to use a library called React-Resizable to help us build the resize handle
- Install: `npm i react-resizable @types/react-resizable`
- Setting up React-Resizable:
  - Create a Resizable component and define a ResizableProps interface for it. This component receives a direction props from the parent component. This component also receives a children props. This allows other components to render inside of this component. In our case, they're the CodeEditor and Preview components. Import the ResizableBox component from react-resizable
  - Import the Resizable component in the CodeCell component. Render it and wrap both the CodeEditor and Preview components inside of it. Pass down a direction props and set it to "vertical"

### Setting a resize handle, adding CSS
- Render the ResizableBox component in the Resizable component. The ResizableBox component can render children components. In our case, it will render the CodedEditor and Preview components
- We can find a list of props that we want to provide to the ResizableBox component in the type def file
  - The width and height props are the starting width and height. Must provide these to be able to see the component on screen
  - The resizeHandles props specifies the location of where the handle is going to be - s, n, w, e, etc.
- Import the Resizable.css file in the Resizable component

### Expanding the resizer handle horizontally
- We can delete the Submit button. We don't want a user have to click a button to run their code. Instead, whenever a user edits some code we immediately feed that code over to the Preview window/component and try to run it
- Let's add some styling so that the CodeEditor and the Preview window show up next to each other horizontally. We want to set the flexDirection on the items inside the Resizable component to `row`
- We want the ResizableBox component to take up the entire width of the browser window (100% width). Unfortunately the ResizableBox component does not support percentage widths. The work-around to this problem is to set the width property to `Infinity`. This allows the width to take up the horizontal space as possible
- Now the resizer handle spans the entire width of the screen

### Expanding the CodeEditor, resizing vertically
- We want the Preview window to have a white background to contrast the CodeEditor of dark background. This ensures that the user knows that some contents will appear there. And we want the Preview iframe to take up 100% height
- When there is space, we want the CodeEditor to take up 100% width. And it takes up 100% height
- We add a max and min constraints to the ResizableBox component so that the user cannot drag the resizer all the way to the bottom of the screen or minimize the CodeCell to nothing

### Resizing horizontally, applying horizontal resize props
- Inside of the CodeCell component, add another Resizable component and wrap the CodeEditor component inside of it. Pass down the direction props and set it to 'horizontal'. Now there should be a resizer handle on the editor for us to drag to resize it
- In order for resizing horizontally to work, we need to add some logic to decide whether the direction props that's being passed down from the parent component to Resizable component is 'horizontal' or 'vertical'. Then we can provide different resizableProps object to each
- To annotate the type of resizableProps, we can import the ResizableBoxProps type definition into our project. This way TS will have enough information to make sure that we provide all the required properties inside the two resizableProps objects - one for horizontal and one for vertical resizer

### Updating resizer props, improving resize performance
- Right now our editor and preview window don't resize themselves when the browser window  changes. It would be nice if both the editor and preview window would shrink and expand as the browser window change
- To do this, we want to make use of useEffect() hook to listen for changes to the browser window (addEventListener on window) and update the states that keep track of the size of window's width and height
- We can then pass down the window width and height states to the resizableProps and this in turn, updates the ResizableBox component  
- Since using useEffect() hook will cause the page to re-render every time the window size changes, we don't want it to re-render so frequently. For this, we want to make use of a technique known as debouncing inside of useEffect() hook. It will only update the window width and height states after a certain amount of setTimeout

### Synchronizing width state
- Currently, we've set the initial width of the editor to be 75% of the browser window width and the preview window to take up the remaining 25% width. A user can use the resizer handle to resize the widths of both. However, when they start to change or resize the browser window dimensions, the preview window jumps to its initial 25% width
- This behavior happens because the ResizableBox component has its own internal width state. The Resizable component width prop gets updated with the new width, but the internal width state for the ResizableBox component never got updated as well. So when the browser window size changes, it causes the Resizable component to re-render and since the ResizableBox component is a child of it, ResizableBox gets re-render as well. It re-renders with the initial width state
- We need to synchronize the width state of the ResizableBox whenever we update the width prop of the parent Resizable component

### Adding debouncing logic
- We want our user to be able to type into the code editor and then if they stop typing for about one second or so, we want to automatically take that code, bundle it, and execute it inside the preview window. We want all this to be automatic because we took out the Submit button that we had previously. We also want to make sure that there is a slight delay between the user's last key press and when we attempt to bundle the user's code. We don't want to bundle with every key press
- This entire process is referred to as debouncing. Debouncing is when we want to allow some function or some code to run (as much as possible) and only after some period of time elapses we then want to do some other process
- Timeline:
  - User types in editor -> input state updated -> set timer to bundle in 1s
  - User types in editor -> input state updated -> cancel prev timer & set time to bundle in 1s
  - 1 second passes without any update to input state
  - Run bundling logic

### Adding an execution timeout in Preview component
- We can delay the postMessage function with a setTimeout. This is going to make sure that our browser has enough time to update the srcdoc and setup an event listener and watch for our postMessage attempt that's going to come about 50 milliseconds later
- And now the result persists on the preview window


## TECHNIQUES FOR ERROR HANDLING IN REACT APPS
- There are 3 kinds of errors that might happen when we start to bundle and execute a user's code:
  - A bundling error or syntax error - invalid code and we can't bundle it
  - A synchronous runtime error - error during execution
  - An asynchronous error - this error gets thrown at some future point in time

### Extracting reusable error handling logic
- Extract the error handling logic into its own function so that we can reuse it
- Handling synchronous runtime errors

### Handling async errors
- To make sure that we capture any error that occurs at any point in time inside a browser-based environment, we can set up an event listener on our window object and watch for a specific type of event - an ErrorEvent
- We can display the error message to the user from `event.error`

### Capturing bundling errors, printing the captured error
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

### Creating a TextEditor component using react-md-editor library
- We will be using a library called React Markdown Editor to help us build the markdown editor for our project
- Install: `npm i --save-exact @uiw/react-md-editor@2.1.1`
- Docs: https://www.npmjs.com/package/@uiw/react-md-editor
- We will make use of 2 components from this library
  - MDEditor component will display a markdown editor on the screen
  - MDEditor.Markdown component will display a preview window to the user

### Toggling the markdown editor mode
- We want our user to be able to toggle between the edit mode and the view mode
- If the editing mode is true, the editor is opened. And as long as the user clicks inside of the editor it remains open
- If the user starts clicking anywhere outside of the editor, the editing mode becomes false and the editor will close and the view mode comes on

### Fixing CSS conflicts, applying styles to markdown
- Solving class name conflicts between react-md-editor and Bulma CSS
- Fixing the divider height
- Restyling markdown editor resizer handle
- Applying additional styling to markdown editor
- Applying the dark theme to the markdown

### Adding state to the editor, last touch of markdown styling
- In the TextEditor component, we want to add in a piece of state to keep track of whatever the user types into the editor and show that inside the preview portion of the component
- Add a last touch of styling to our markdown to make it look like a card. CSS styling coming from Bulma


## DESIGN PATTERNS FOR REDUX WITH TYPESCRIPT

### Creating file structures, installing Redux-related modules
- Install: `npm i --save-exact @types/react-redux@7.1.15 axios@0.21.1 react-redux@7.2.2 redux@4.0.5 redux-thunk@2.3.0`

### Defining action types and cell types, create interface definitions
- Define action types enum - in action-types folder
- Create actions interface definitions - in actions folder
  - For each ActionType, we will create an interface that describes an action (with type and payload properties) that will eventually be dispatched by one of our action creators, and then processed by one of our reducers
- Defining what a cell is - in cell.ts file
  - Create a cell interface definition that describes what properties a cell has
  - We can then reuse this cell interface throughout Redux
  - Define a type CellTypes so we can change cell types in one location only

### Setting up cells reducer, adding simple switch cases
- Define a cells reducer - in reducers/cellsReducer.ts file
- A cells reducer will manage the following properties:
  - data: listing of all cells. Is an object where the key is the cell id and value is the cell object
  - loading: true/false whether we are fetching data. Is a boolean type
  - error: errors related to saving cells. Is either a string or null
  - order: order of cells. Is an array of strings
- Add a switch statement to handle different action.type from incoming actions of this reducer. For now, we're just going to return state for each case, but will come back to put in additional implementation for each

### Creating and exporting the store
- Create a reducers using combineReducers() - in reducers/index.ts file
  - Define the reducers type
- Create a store using createStore() - in store.ts file
- Create an entry point index.ts file at the root of state directory
  - Export everything related to Redux into this file
  - Export the store
  - Export the reducers

### Connecting React to Redux
- Connect React to Redux - in index.tsx file of project root directory
  - Import the Provider component from react-redux
  - Render the Provider and wrap all of our existing components inside the Provider
  - Import the store. Pass down the store as store props in the Provider
  - Now all of our components that are inside this Provider will have access to the Redux store

### Adding implementations of action creators
- All of our action creators, with the exception of fetchCells, are synchronous in nature. Whenever we call these action creators, we get back the actions instantaneously because these are not outside requests
- Write a separate function for each action creators - in action-creators/index.ts file
  - updateCell()
  - deleteCell()
  - moveCell()
  - insertCellBefore()
- Annotate the return type of each action creator functions. Need to export then import each type action interfaces
- Define type Direction - in actions/index.ts file
- Add in implementations of action creators - in action-creators/index.ts file

### Adding implementations for update cell logic
- In cells reducer, we're going to add in the implementations logic for UPDATE_CELL ActionType 


## SIMPLIFY STATE UPDATES WITH IMMER LIBRARY
- Updating the states can get very complicated. For that, we're going to use a package called Immer to help us update our states
- Immer allows us to make direct updates to our state object without having to write complicated spread statements like we did in the previous step
- Install: `npm i immer`
- Immer docs: https://immerjs.github.io/immer/docs/update-patterns

### Updating cells with Immer
- Handle UPDATE_CELL action
- Import the produce function from immer
- Wrap our entire reducer function inside of the produce() function
- We can remove the return type of reducer function because sometimes we don't need to return anything
- Add a `return;` to make sure that we don't run other switch cases after
- However, we should `return state;` (return state object) to satisfy Typescript. Or else TS may give us an error of `undefined` when we run our actions

### Removing a cell
- Handle DELETE_CELL action - in cellsReducer.ts file
- The payload is the id of the cell we want to delete
- When deleting a cell, we need to delete it from the `data` object by the cell id and remove the cell id from the `order` array
- Basically we want to perform an object mutation and an array mutation on our state

### Swapping cell placement
- Handle MOVE_CELL action - in cellsReducer.ts file
- The payload we get is the cell id and the direction (up or down the list)
- We swap the cells depending on the direction given

### Inserting new cells
- Handle INSERT_CELL_BEFORE action - in cellsReducer.ts file
- The payload is the cell id where we want to insert a new cell before it and the new cell data
- When inserting a new cell, we need to update the `order` array with the cell id and update the `data` object with the cell object

### Manual testing of a Redux store
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

### Creating CellList and CellListItem components
- The CellList component renders a list of cells to the user
  - This component gets the list of cells from the store and display them on the screen
  - It also needs the order array for it to figure out the order to display the cells in
- The CellListItem component renders each individual cell
  - Its job is to figure out what kind of cell to show: code cell or text cell
  - It also has 3 buttons: delete the cell, move the cell up, and move the cell down 

### Creating a typed selector: useTypedSelector hook
- Create a useTypedSelector hook. This hook will understand the type of data that is stored inside of our store
- Whenever we want to access any state inside a component, we're going to use this useTypedSelector hook

### Selecting an ordered list, rendering cell types
- In CellList component, call useTypedSelector() hook to access the state in Redux store, and we only want to get the cells state. Then destructure data and order properties from cells state
- Get the list of cells in data object by mapping over the order array. This will return an array of cells in the order that the cell id is stored in the order array
- Then iterate over the cells array and display each cell in a `<CellListItem />` component. Pass down the cell object as cell props to the CellListItem component
- In the CellListItem component:
  - Receive the cell props from the parent component
  - Create a CellListItemProps interface definition that contains the cell props set to Cell type. Then assign this interface to CellListItem component
  - If the cell type is equal to 'code', render the `<CodeCell />` component
  - Else render the `<TextEditor />` component

### Creating an action creator helper: useActions hook
- Whenever we call useActions() hook inside a component, we will have access to all the actions available and then we can destructure just the ones we want to use

### Refactoring: extracting state from CodeCell component
- Currently our CodeCell component has code, err, and input states. We make use of these states for testing purposes while we were building the CodeCell (the CodeEditor and Preview window)
- Now we no longer need to use these states. The CodeCell component is rendered inside the CellListItem parent component. The CellListItem component will provide the cell object (coming from the store) as cell props, and the CodeCell component can dispatch an action to update the cell state in Redux store
- In CodeCell component:
  - Receive the cell props from the CellListItem parent component
  - Define a CodeCellProps interface for the component
  - Call useActions() hook and destructure the `updateCell` action
  - We won't make use of the input state anymore. We replace `input` with `cell.content`. Replace `setInput()` with `updateCell()`

### Refactoring: extracting state from TextEditor component
- Currently the TextEditor component is using the `value` state to keep track of the value from the MDEditor and MDEditor.Markdown component
- In TextEditor component:
  - Receive the cell props from the CellListItem parent component
  - Define a TextEditorProps interface for the component
  - Call useActions() hook and destructure the `updateCell` action
  - Replace `value` state with `cell.content`
  - Replace `setValue()` with `updateCell()`

### Creating ActionBar component
- This ActionBar component is rendered in the CellListItem parent component. It should receive a cell id as id props
- Define the props interface definitions
- Import the moveCell and deleteCell actions using useActions() hook
- This component renders the Up, Down, and Delete buttons
- Add an onClick event handler to each button elements. When a user clicks on the Up or Down button, call the moveCell() action and pass in the id and the direction as arguments
- When they click on the Delete button, call the delete() action and pass in the id as an argument

### Adding icon buttons, applying custom CSS to ActionBar component
- We're going to make use of the fontawesome library to display our icons
- Install: `npm i @fortawesome/fontawesome-free`
- We want to show the 3 action buttons on the right hand side of each cell
- The ActionBar will be dim and when a user hovers over it does it get bright
- For the CodeCell, we want to add a bar right above the CodeCell and the ActionBar sits inside of it on the right side

### Creating an AddCell component
- The AddCell component adds a new cell to the cell list. It adds either a code cell or a text cell
- This component receives nextCellId as props
- Import the insertCellBefore action using useActions() hook
- The AddCell component renders two buttons - one is 'Code' cell and the other is 'Text' cell
- When one of these buttons is clicked, the insertCellBefore() action is dispatched and it takes the nextCellId and the type of 'text' or 'code' as arguments
- This will insert either a code cell or a text cell to the cells array depending on the cell type given

### Displaying AddCell component in CellList component
- Inside of the CellList component is where we render each cell in a CellListItem component. And for each cell being rendered, we want to display our AddCell component just above it
- And then at the bottom of the cell list we want to render the AddCell component once more, but the nextCellId is set to `null` because we don't have a nextCellId as this is the end of the cell list
- We need to update our cell id type to be able to accept `null` as well

### Styling the AddCell component
- We want the two buttons to be in the middle of the screen and a line is drawn through, but is behind, the two buttons
- Style the buttons to have rounded corners and include a plus icon on the left side
- We don't want to show the AddCell buttons initially until a user hovers over it

### Forcing AddCell visibility on CellList
- When there is no cell left in the CellList we want to make sure that the AddCell is always visible to the user
- Add a forceVisible props to AddCell Component and make the props optional by adding a question mark next to it in the interface definition

### Adding vertical spacing between AddCell bar, add transition
- Right now our AddCell component is squished right next to the vertical resizer handle and we're not able to resize the CodeCell vertically. We can apply some vertical margin between the AddCell
- Also, apply additional transition properties to the AddCell component so there will be a little longer delay before the user sees the AddCell when they hover over the area

### Fixing AddCell behavior: refactoring the Redux side
- We want to modify the way a new cell gets added to the end of CellList
- If there is no cell in CellList, add the new cell at the beginning (unshift method) of cells array, instead of at the end (push method) of the array
- If there is cell in CellList, add the new cell AFTER the foundIndex cell, instead of before the foundIndex cell
- Change the name of action type from `INSERT_CELL_BEFORE` to `INSERT_CELL_AFTER`

### Fixing AddCell behavior: refactoring the React side
- The behavior we're trying to fix: when we click on the AddCell at the bottom of CellList, a new cell is inserted and the AddCell component that we clicked on get shifted down the CellList in the DOM. At the same time, this last AddCell component is visible for a moment and then just disappears
- So in general, when inserting an item into a list, it's best practice to insert it after instead of before. This way it doesn't generate this weird behavior


## CONNECTING BUNDLES IN REDUX

### Defining bundling action types and interfaces
- The two action types for our bundling process are: BUNDLE_START and BUNDLE_COMPLETE
- Define interfaces for both action types
- When our BundleCell action creator starts, it's going to dispatch the BundleStartAction. It will take a cellId as an argument. At this stage we may show a loading icon while the use's code is bundling
- Once the code has been bundled, the BundleCell action creator will dispatch the BundleCompleteAction. This action takes in a payload of the cellId and the result of the bundling process which contains the code and err properties

### Adding the bundlesReducer
- The bundlesReducer function handles the implementations of both BUNDLE_START and BUNDLE_COMPLETE action types. It updates the bundles state in the store according to the action type being called
- The bundlesReducer manages the bundles state in Redux store. The bundles state properties are:
  - loading: boolean
  - code: string
  - err: string
- Wire up the bundlesReducer function to the combineReducers() call

### Adding the createBundle action creator
- The createBundle action creator...
  - takes in some amount of user's code and a cellId: input and cellId
  - returns a function. This function...
  - dispatches the BUNDLE_START action with a payload of cellId
  - starts the bundling process: asynchronously calling the bundle() function with the given input. Stores the bundle result in result variable
  - then dispatches the BUNDLE_COMPLETE action with a payload of cellId and bundle object which has the result code and err properties
- Because we are dispatching two actions from one action creator and because we're having asynchronous code (bundling process is asynchronous), we're going to make use of Redux thunk

### Wiring up to React
- Now we can wire up the bundles state in Redux store to our CodeCell component
- In the CodeCell component:
  - We no longer need the code and err states anymore. Now the output code and the err value is going to be stored in Redux store. Also, we are no longer doing the bundling inside of this component. Instead, we call the createBundle() function to do the bundling
  - Call useTypedSelector() hook to access the Redux store and we specifically want to access the bundles state and look up for a particular bundle based on the given cell.id. Remember that there could be many bundles being process and each bundle has a cellId attached to it
  - For rendering the Preview component, it now gets the code props from `bundle.code` and the err props from `bundle.err`. The bundle.code contains the bundled code to be executed by the Preview component and display on the preview window. If there's an error in `bundle.err`, it will display the error message instead

### Solving infinite calls on createBundle with useMemo hook
- Since we're calling the createBundle action creator inside the useEffect hook, the CodeCell component keeps re-rendering itself and this causes the preview window to keep reloading
- To solve this issue we make use of the useMemo hook from React

### Getting an initial bundle
- When the CodeCell component loads for the very first time, the bundles state in Redux store is empty and loading is set to true
- So when CodeCell component first loads and there's no bundle, we want to call createBundle() to create a bundle right away. This will cause the preview window to render immediately instead of one second later
- Only when a user engages with our code editor will we wait for one second before calling createBundle() to start the bundling process. Since createBundle() is called inside useEffect hook, this function runs when one of the items in dependencies array changes i.e., when cell.content changes

### Showing a loading progress bar icon
- We want to show a progress bar icon over the preview window if no content in bundle state or if bundle.loading is true










## JAVASCRIPT TRICKS

#### Generating random ids or unique ids
```js
function randomId() {
	return Math.random().toString(36).substr(2, 5);
};
```