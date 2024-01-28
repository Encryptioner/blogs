# pnpm - A better package manager for Node.js

<div align="center">
  <img src="https://dev-to-uploads.s3.amazonaws.com/uploads/articles/konqmhymdp515yau8vcw.gif" alt="pnpm"/>
</div>

### We will talk about pnpm, but first let's have a brief introduction on package manager

`Node.js` is a popular choice for developers which allows using JavaScript on both client and server side. Having a big community, node.Js provides numerous public and private packages to integrate into projects. To manage these projects, we have package manager. `npm` is the standard package manager for node.js


#### How `npm` works
1. On a freshly installed device, `npm` reads `package.json` file and starts checking the defined version on `npm registry`
2. On matching the version, it firsts download the package in `global cache directory` of the device
3. Later copies the package on the `node_modules` directory of the `project specific directory`
4. While running the project, packages in the `project specific directory` is used
5. The `global cache directory` helps `npm` to find the specific version of `package` when that version is required again

#### It's kind of a good approach. However, there are some `cons` to this approach
- Redundant use of device space - I am pointing inefficient use of non-volatile memory (SSD, HDD). It is common that one can have multiple similar project. In that case, most of the packages (and their version) will be same. However, for each one of them, a package will be copied to multiple `project specific directory`. Those `node_modules` directories will gradually take up device space which u need to store other resources. U may all have seen this meme 😀

<div align="center">
 <img src="https://dev-to-uploads.s3.amazonaws.com/uploads/articles/zjskj9fk5z5nr31auh5s.jpg" alt="big-node-modules" height="200px" />
 <img src="https://dev-to-uploads.s3.amazonaws.com/uploads/articles/130c8dn74ox6idf0ma7x.jpg" alt="long-npm-install" height="200px" />
</div>
  
- Long installation time - U may not worry about disk space. But lengthy installation time will scare you. For a relatively simple project, required packages can be large. `npm install` requires a copy of the package twice. First in `global cache directory` and later in `project specific directory`. Copying this every time for every new project will surely kill your time


## Better solution

You need to reduce your disk space and installation time. So that, u can focus on development. Now `pnpm` comes into the picture. The way `pnpm` works is simple but brilliant.

1. `pnpm` download packages from `npm registry` similar to `npm`
2. It stores packages in `global cache directory` same as `npm`
3. Now the magic happens. Instead of copying the packages to `project specific directory` one by one according to `package.json` file, it hard links the package to `node_modules` of `project specific directory`.
4. It seems copying, but it is not. As it just links (similar to file/folder shortcut) the package path from `global cache directory` to `project specific directory` without copying the whole file. Which saves both installation time and disk space.

### Using `pnpm` in projects
1. [Install pnpm](https://pnpm.io/installation). U may install stand alone script install `pnpm` globally using `npm`
2. With `node & npm`, It is common to use `nvm (node version manager)` for different version of `node.Js`. Remember that, for each version of node, u need to install `pnpm` globally
3. Ensure your pnpm executable path is in your global `bash PATH`. You can add it in your `.bashrc` or `.zshrc` file in following way:
    ```
    export PNPM_HOME="/Users/ankur/Library/pnpm"
    export PATH="$PNPM_HOME:$PATH"
    ``` 
4. `pnpm` has a rich list of [CLI commands](https://pnpm.io/cli/run) for installation, update, run script. Common commands are:

<div align="center">
<table>
 <thead>
   <tr><th>Command</th><th>Meaning</th></tr>
 </thead>
 <tbody>
   <tr><td><code>pnpm add sax</code></td><td>Save to <code>dependencies</code></td></tr>
   <tr><td><code>pnpm add -D sax</code></td><td>Save to <code>devDependencies</code></td></tr>
   <tr><td><code>pnpm add sax@3.0.0</code></td><td>Specify version <code>3.0.0</code></td></tr>
   <tr><td><code>pnpm i</code></td><td>Install package from <code>package.json</code></td></tr>
   <tr><td><code>pnpm rm sax</code></td><td>Remove package from <code>package.json</code></td></tr>
   <tr><td><code>pnpm run &lt;command-name&gt;</code></td><td>Run command from <code>package.json</code></td></tr>
   <tr><td><code>pnpm --filter &lt;package_selector&gt; &lt;command&gt;</code></td><td>Filtering allows you to restrict commands to specific subsets of packages.</td></tr>
 </tbody>
</table>
</div>

5. U can also create multiple workspaces inside your project and handle all the packages from from your root directory using `pnpm`. It is specially helpful for monorepo. To create workspace, just create a new `pnpm-workspace.yaml`. In that file you can define your workspaces. U can also use `glob pattern`. For example:

    ```yaml
    packages:
    - "packages/*"
    ```

    Now in the `scripts` section of `package.json` filter the workspaces

    ```json
    "w:server": "pnpm --filter server",
    "w:client": "pnpm --filter client",
    ```

    Then u can easily run workspace specific command. Something like this `pnpm w:server build`
6. You can easily use `pnpm` in [docker](https://pnpm.io/docker)
7. `pnpm` can easily be used in various [continuous integration](https://pnpm.io/continuous-integration) systems.


## Bonus 😀
U can easily debug your server side using `vscode` with `pnpm`. U just need to add configuration in your `.vscode/launch.json` file

```json
{
  "name": "Launch server via pnpm",
  "type": "node",
  "request": "launch",
  "cwd": "${workspaceFolder}",
  "runtimeVersion": "18.11.0",
  "runtimeExecutable": "pnpm",
  "runtimeArgs": ["w:server start"]
}
```

## End:

That's all!

I hope you've found the article useful. U should try `pnpm` if u haven't already. Feel free to share your thoughts in the comments below.

Check more on
- [Linkedin](https://www.linkedin.com/in/mir-mursalin-ankur)
- [Website](https://encryptioner.github.io)
- [X (Twitter)](https://twitter.com/AnkurMursalin)
