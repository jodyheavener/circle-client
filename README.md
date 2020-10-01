# CircleCI JS Client

A JavaScript client for CircleCI's [v2 API](https://circleci.com/docs/api/v2/).

## Usage

### Setup

First, go and get a CircleCI [API Token](https://app.circleci.com/settings/user/tokens).

Then all you need to do is import the client class and instantiate it with your token and optionally a project slug and default branch:

```ts
import CircleCI from 'circle-client';

const client = new CircleCI(
  '2c818264d2557cd14b9fc3fa538df6ecbc6489f3',
  // this could also be "github/owner/repo"
  ['github', 'owner', 'repo'],
  {
    // methods that take a branch arg can override this
    branch: 'main',
  }
);
```

Your project slug consists of:
- The VCS provider (either `github` or `bitbucket`)
- The project's owner (e.g. your username or organization name)
- The repo name

### Methods

Below is a summary list of available methods. Check out the main [client file](./src/client.ts) for fully-typed method signatures.

**Paginated results**: any method that begins with `list` returns a `Paged<T>` object, with an `items` property containing the API results, and a `next_page_token` property. If `next_page_token` is set, you can use it to call the method again with the `pageToken` argument set to that value to retrieve the next page of results.

#### Context [🔗](https://circleci.com/docs/api/v2/#tag/Context)

🚧 This set of endpoints are listed as Preview and may change without warning.

- `listContexts` - List all contexts for an owner.
- `createContext` - Create a new context.
- `deleteContext` - Delete a context.
- `listContextEnvVars` - List information about environment variables in a context, not including their values.
- `createContextEnvVar` - Create or update an environment variable within a context.
- `deleteContextEnvVar` - Delete an environment variable from a context.

#### Insights [🔗](https://circleci.com/docs/api/v2/#tag/Insights)

- `listWorkflowMetrics` - Get summary metrics for a project's workflows.
- `listWorkflowRuns` - Get recent runs of a workflow.
- `listWorkflowJobMetrics` - Get summary metrics for a project workflow's jobs.
- `listWorkflowJobRuns` - Get recent runs of a job within a workflow.

#### User [🔗](https://circleci.com/docs/api/v2/#tag/User)

🚧 This set of endpoints are listed as Preview and may change without warning.

- `getMe` - Information about the user that is currently signed in.
- `getCollaborations` - Provides the set of organizations of which the currently signed in user is a member or a collaborator.
- `getUser` - Information about the user with the given ID.

#### Pipeline [🔗](https://circleci.com/docs/api/v2/#tag/Pipeline)

- `listPipelines` - Returns all pipelines for the most recently built projects you follow in an organization.
- `getPipeline` - Returns a pipeline by ID.
- `getPipelineConfig` - Returns a pipeline's configuration by ID.
- `listPipelineWorkflows` - Returns a paginated list of workflows by pipeline ID.
- `triggerProjectPipeline` - Triggers a new pipeline on the project.
- `listProjectPipelines` - Returns all pipelines for this project.
- `listOwnProjectPipelines` - Returns a sequence of all pipelines for this project triggered by the user.
- `getProjectPipeline` - Returns a pipeline by number.

#### Job [🔗](https://circleci.com/docs/api/v2/#tag/Job)

🚧 This set of endpoints are listed as Preview and may change without warning.

- `getJob` - Returns job details.
- `cancelJob` - Cancel job with a given job number.
- `listJobArtifacts` - Returns a job's artifacts.
- `listJobTests` - Get test metadata for a build.

#### Workflow [🔗](https://circleci.com/docs/api/v2/#tag/Workflow)

- `getWorkflow` - Returns summary fields of a workflow by ID.
- `approveWorkflowJob` - Approves a pending approval job in a workflow.
- `cancelWorkflow` - Cancels a running workflow.
- `listWorkflowJobs` - Returns a sequence of jobs for a workflow.
- `rerunWorkflow` - Reruns a workflow.

#### Project [🔗](https://circleci.com/docs/api/v2/#tag/Project)

- `getProject` - Retrieves a project by project slug.
- `listCheckoutKeys` - Returns a sequence of checkout keys for the project.
- `createCheckoutKey` - Creates a new checkout key.
- `deleteCheckoutKey` - Deletes the checkout key.
- `getCheckoutKey` - Returns an individual checkout key.
- `listEnvVars` - List all environment variables (masked).
- `createEnvVar` - Creates a new environment variable.
- `deleteEnvVar` - Deletes the environment variable named.
- `getEnvVar` - Returns the masked value of an environment variable.

### Errors

In addition to [Fetch errors](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch#Checking_that_the_fetch_was_successful), the following errors can occur:

- Any method that relies on a project slug will throw a `ProjectSlugError` if one is not set when the method is called.
- When an API call is made, if the response status code does not equal the success code indicated for that endpoint in API documentation, an `APIError` will be thrown. The object contains a `message` (which might be generated by the client or the API), `status`, and the `response` object of the Fetch request.
- A method may throw `ArgumentError` if an invalid set of arguments is provided that cannot be caught by TypeScript.

## Development

Development is pretty straightforward:

- Run `yarn build` to generate a new distribution build.
- `yarn lint` and `yarn format` are also available and do exactly what they say.

### Testing

Run tests:

- `yarn test` (optionally with `--watchAll`)

Run the CircleCI test job locally:

- Download the [CircleCI CLI](https://circleci.com/docs/2.0/local-cli/#installation)
- If you're changing the config, validate your changes: `circleci config validate`
- Generate a local config file: `circleci config process .circleci/config.yml > .circleci/local.yml`
- Execute the test job: `circleci local execute -c .circleci/local.yml --job test`
