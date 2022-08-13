<p align="center">
  <a href="https://github.com/devgioele/fabriko/actions/workflows/verification.yml"><img alt="fabriko verification status" src="https://github.com/devgioele/modern-typescript-action/workflows/Verification/badge.svg"></a>
</p>

# Fabriko

A GitHub Action that manages user permissions and Mapbox accounts for geographic information systems

## Getting started

### Install Node.js

Install [version 16.10 or higher of Node.js](https://nodejs.org/en/download/). Use `node -v` to check your current version.

### Enable corepack

```sh
corepack enable
```

### Install dependencies

```sh
yarn
```

### Test and build package

```sh
yarn test && yarn build
```

## Notes

### Convert GeoJSON to GeoJSONL

Using `jq`:

```sh
jq --compact-output '.features[]' < input_file > output_file
```

Replace `input_file` and `output_file` with your file paths.

### Debugging

`core.debug()` does only output if the debugging mode is enabled.

On **GitHub** you can enable it by setting the **secret** `ACTIONS_STEP_DEBUG` to `true`.
\_Note: You should hesitate to enable this on GitHub, because secrets may be printed while in debug mode.

If using **act**, you can enable it by passing the flag `--verbose`.
_Note: This does not currently work. Follow [the related GitHub issue](https://github.com/nektos/act/issues/1006)._

1. Install [act](https://github.com/nektos/act) to run GitHub Actions locally, which includes having Docker.
2. Test, package and run the GitHub Action:

```sh
yarn dev
```

## Benchmarking

### Procuring infrastructure

Use the terraform files to setup the Azure resources required for a successful Fabriko run.

You can follow the (HashiCorp guide)[https://learn.hashicorp.com/tutorials/terraform/azure-build?in=terraform/azure-get-started]. The main points are: 
- Install the Azure CLI
- Create a Service Principal
- Export the secrets
- Run `terraform init`
- Run `terraform plan`
- Run `terraform apply`

### Deploying Azure Functions as mock API

Install the **Azure CLI** if you haven't already.

Install the **Azure Functions Core Tools**.

Run the following inside the mock-api directory.

Build the Azure Functions project:
```
yarn build
```
Deploy the Azure Functions project:
```
func azure functionapp publish fabriko-mock-api
```

### Give service principal access to Azure Storage

Azure's RBAC (Role-Based Authentication Access Control) is used to received the authorization to download block blobs from the created Azure Storage account.

For simplicity, the same service principal used by Terraform is also used to access Azure Storage.

Follow [Microsoft's guide](https://docs.microsoft.com/en-us/azure/role-based-access-control/role-assignments-portal?tabs=current#step-1-identify-the-needed-scope) to assign the `Storage Blob Data Reader` role definition to the service principal. It gives the following permissions:
- Microsoft.Storage/storageAccounts/blobServices/containers/read
- Microsoft.Storage/storageAccounts/blobServices/generateUserDelegationKey/action
- "Microsoft.Storage/storageAccounts/blobServices/containers/blobs/read

#### Using secrets locally

The `.secrets` file is a [.env](https://www.dotenv.org/env) file placed in the root directory that is used to pass secrets to the GitHub Action while running it locally with act.

### Publish to a distribution branch

Actions are run from GitHub repos so we will checkin the packed dist folder.

Then run [ncc](https://github.com/zeit/ncc) and push the results:

```bash
$ yarn build
$ git add dist
$ git commit -a -m "prod dependencies"
$ git push origin releases/v1
```

Note: We recommend using the `--license` option for ncc, which will create a license file for all of the production node modules used in your project.

Your action is now published! :rocket:

See the [versioning documentation](https://github.com/actions/toolkit/blob/master/docs/action-versioning.md)

### Usage

After testing you can [create a v1 tag](https://github.com/actions/toolkit/blob/master/docs/action-versioning.md) to reference the stable and latest V1 action
