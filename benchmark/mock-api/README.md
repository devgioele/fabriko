# Azure Functions API

The modern serverless way of writing APIs with Azure

## Getting started

### Configure local Azure Functions settings

Create a file named `local.settings.json` in the root directory with the following content:

```json
{
  "IsEncrypted": false,
  "Values": {
    "FUNCTIONS_WORKER_RUNTIME": "node"
  }
}
```

This tells the local worker what runtime to use during development.

### CLI tools

Install the **Azure CLI** and the **Azure Functions Core Tools**.
The installation depends on your OS.

### Node.js

Azure Functions does not support every Node.js version. It is best to install Node.js version manager.

Install [nvm](https://github.com/nvm-sh/nvm) following its documentation.

At this moment of writing the latest Node.js version supported by Azure Functions is `16`. Install and use it:

```sh
nvm install 16
nvm use 16
```

Whenever you want to switch to the system-installed version of Node.js, run:

```sh
nvm use system
```

### Run the function project

To host the functions locally, run:

```sh
pnpm dev
```

### Create a new function

Run the following and follow the instructions to create a new function:

```sh
func new
```

## Notes

### Documentation about HTTP trigger

See the [official documentation](https://docs.microsoft.com/en-us/azure/azure-functions/functions-bindings-http-webhook-trigger?tabs=in-process%2Cfunctionsv2&pivots=programming-language-javascript) about the Azure Functions HTTP trigger for reference.

Common articles of help:

- [Route Constraints](https://docs.microsoft.com/en-us/aspnet/web-api/overview/web-api-routing-and-actions/attribute-routing-in-web-api-2#constraints)

### Bindings

Bindings connect an Azure Function to other resources or triggers.
Triggers are what cause a function to run and are therefore an input binding.
Resources can be read or written and can therefore be an input or an output binding.

### Extensions

Azure Functions use extensions to enable certain bindings. Extensions can be installed manually, but it is recommended to use an extension bundle. An extension bundle is a pre-defined set of compatible binding extensions.

When specifying what extension bundle to use in the file `host.json`, keep in mind that `[` or `]` means 'inclusive' and `(` or `)` means exclusive.

E.g. the version `[3.3.0, 4.0.0)` means translated to Node.js' semantic versioning syntax: `^3.3.0`.

If you are not able to use an extension bundle, do not specify the extension bundle in the `host.json` file and install the extension manually:

```sh
func extensions install --package <package-id> --version <version>
```

### Schema of `function.json`

The schema for `function.json` files is available at [schemastore.org](http://json.schemastore.org/function).
