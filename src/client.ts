import fetch from 'isomorphic-fetch';
import pck from '../package.json';

export enum WorkflowStatus {
  Success = 'success',
  Running = 'running',
  NotRun = 'not_run',
  Failed = 'failed',
  Error = 'error',
  Failing = 'failing',
  OnHold = 'on_hold',
  Canceled = 'canceled',
  Unauthorized = 'unauthorized',
}

export enum RunStatus {
  Success = 'success',
  NotRun = 'not_run',
  Failed = 'failed',
  Canceled = 'canceled',
  Unauthorized = 'unauthorized',
}

export enum JobType {
  Build = 'build',
  Approval = 'approval',
}

export enum HTTPMethod {
  Post = 'post',
  Get = 'get',
  Put = 'put',
  Delete = 'delete',
}

export type Paged<T> = {
  items: T[];
  next_page_token: string | null;
};

export type ErrorResponse = {
  message?: string;
};

export type Params = {
  [value: string]: any;
};

export type ProjectSlug = [
  vcsSlug: 'github' | 'bitbucket',
  orgName: string,
  repoName: string
];

export type EnvVar = {
  name: string;
  value: string;
};

export type Pipeline = {
  id: string;
  errors: {
    type: 'config' | 'plan';
    message: string;
  }[];
  project_slug: string;
  updated_at?: string;
  number: number;
  state: 'created' | 'errored' | 'pending';
  created_at: string;
  trigger: {
    type: 'explicit' | 'api' | 'webhook';
    received_at: string;
    actor: {
      login: string;
      avatar_url: string;
    };
  };
  vcs?: {
    provider_name: 'Bitbucket' | 'GitHub';
    origin_repository_url: string;
    target_repository_url: string;
    revision: string;
    branch?: string;
    tag?: string;
    commit?: {
      subject: string;
      body: string;
    };
  };
};

export type PipelineConfig = {
  source: string;
  compiled: string;
};

export type Project = {
  slug: string;
  organization_name: string;
  name: string;
  vcs_info: {
    vcs_url: string;
    default_branch: string;
    provider: 'Bitbucket' | 'GitHub';
  };
};

export type Job = {
  canceled_by?: string;
  dependencies: string[];
  job_number?: number;
  id: string;
  started_at: string;
  name: string;
  approved_by?: string;
  project_slug: string;
  status: string;
  type: JobType;
  stopped_at?: string;
  approval_request_id?: string;
};

export type JobDetail = {
  web_url: string;
  project: {
    slug: string;
    name: string;
    external_url: string;
  };
  parallel_runs: {
    index: number;
    status: string;
  }[];
  started_at: string;
  latest_workflow: {
    id: string;
    name: string;
  };
  name: string;
  executor: {
    type: string;
    resource_class: string;
  };
  parallelism: number;
  status: string;
  number: number;
  pipeline: {
    id: string;
  };
  duration: number;
  created_at: string;
  messages: {
    type: string;
    message: string;
    reason?: string;
  }[];
  contexts: {
    name: string;
  }[];
  organization: {
    name: string;
  };
  queued_at: string;
  stopped_at?: string;
};

export type JobArtifact = {
  path: string;
  node_index: number;
  url: string;
};

export type JobTest = {
  message: string;
  source: string;
  run_time: number;
  file: string;
  result: string;
  name: string;
  classname: string;
};

export type WorkflowRun = {
  id: string;
  duration: number;
  created_at: string;
  stopped_at: string;
  credits_used: number;
  status: RunStatus;
};

export type JobRun = {
  id: string;
  started_at: string;
  stopped_at: string;
  status: RunStatus;
  credits_used: number;
};

export type Workflow = {
  pipeline_id: string;
  canceled_by?: string;
  id: string;
  name: string;
  project_slug: string;
  errored_by?: string;
  status: WorkflowStatus;
  started_by: string;
  pipeline_number: number;
  created_at: string;
  stopped_at: string;
};

export type SummaryMetrics = {
  name: string;
  window_start: string;
  window_end: string;
  metrics: {
    success_rate: number;
    total_runs: number;
    failed_runs: number;
    successful_runs: number;
    throughput: number;
    mttr: number;
    total_credits_used: number;
    duration_metrics: {
      min: number;
      mean: number;
      median: number;
      p95: number;
      max: number;
      standard_deviation: number;
    };
  };
};

export type CheckoutKey = {
  'public-key': string;
  type: 'deploy-key' | 'github-user-key';
  fingerprint: string;
  preferred: boolean;
  'created-at': string;
};

export type User = {
  id: string;
  login: string;
  name: string;
};

export type Collaboration = {
  'vcs-type': string;
  name: string;
  avatar_url: string;
};

export type Context = {
  id: string;
  name: string;
  created_at: string;
};

export type ContextEnvVar = {
  variable: string;
  created_at: string;
  context_id: string;
};

export class ArgumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ArgumentError';
  }
}

export class ProjectSlugError extends Error {
  constructor() {
    super('A project slug is required to call this method');
    this.name = 'ProjectSlugError';
  }
}

export class APIError extends Error {
  constructor(
    message = 'An API error occurred',
    public status: number,
    public response: Response
  ) {
    super(message);
    this.name = 'APIError';
  }
}

type Headers = { [header: string]: string };

class CircleCI {
  static readonly baseUrl: string = 'https://circleci.com/api/v2';
  private previewWarned = false;
  private branch?: string;
  private headers: Headers = {};

  constructor(
    private readonly apiKey: string,
    public projectSlug?: ProjectSlug | string,
    {
      branch,
      headers = {},
    }: {
      branch?: string;
      headers?: Headers;
    } = {}
  ) {
    this.branch = branch;
    this.headers = headers;
  }

  private async request(
    method: HTTPMethod,
    path: string,
    successStatus: number,
    params?: Params
  ): Promise<{ [value: string]: any }> {
    let fullPath = `${CircleCI.baseUrl}/${path}`;
    let body: string | undefined = undefined;
    let headers: Headers = Object.assign(this.headers, {
      'Circle-Token': this.apiKey,
      'X-Circle-Client': `v${pck.version}`,
    });

    if (params && Object.keys(params).length) {
      if ([HTTPMethod.Get, HTTPMethod.Delete].includes(method)) {
        fullPath += `?${new URLSearchParams(
          params as { [value: string]: string }
        )}`;
      }

      if ([HTTPMethod.Post, HTTPMethod.Put].includes(method)) {
        body = JSON.stringify(params);
        headers['Content-Type'] = 'application/json';
      }
    }

    const response = await fetch(fullPath, {
      method,
      headers,
      body,
    });
    const data = await response.json();

    if (response.status !== successStatus) {
      throw new APIError(
        (data as ErrorResponse).message,
        response.status,
        response
      );
    }

    return data as { [value: string]: any };
  }

  private previewWarn(): void {
    if (this.previewWarned) {
      return;
    }

    console.warn(
      'Warning: you are using a preview API endpoint that may change without warning.'
    );
    this.previewWarned = true;
  }

  getProjectSlug(): string {
    if (!this.projectSlug) {
      throw new ProjectSlugError();
    }

    return encodeURIComponent(
      Array.isArray(this.projectSlug)
        ? this.projectSlug.join('/')
        : this.projectSlug
    );
  }

  /**
   * Retrieves a project by project slug.
   */
  async getProject(): Promise<Project> {
    const data = await this.request(
      HTTPMethod.Get,
      `project/${this.getProjectSlug()}`,
      200
    );

    return data as Project;
  }

  /**
   * Returns a sequence of checkout keys for the project.
   */
  async listCheckoutKeys({
    pageToken,
  }: {
    pageToken?: string;
  } = {}): Promise<Paged<CheckoutKey>> {
    const params: Params = {};
    if (pageToken) {
      params['page-token'] = pageToken;
    }

    const data = await this.request(
      HTTPMethod.Get,
      `project/${this.getProjectSlug()}/checkout-key`,
      200,
      params
    );

    return data as Paged<CheckoutKey>;
  }

  /**
   * Creates a new checkout key.
   */
  async createCheckoutKey(
    type: 'user-key' | 'deploy-key'
  ): Promise<CheckoutKey> {
    const data = await this.request(
      HTTPMethod.Post,
      `project/${this.getProjectSlug()}/checkout-key`,
      201,
      { type }
    );

    return data as CheckoutKey;
  }

  /**
   * Deletes the checkout key.
   */
  async deleteCheckoutKey(fingerprint: string): Promise<void> {
    await this.request(
      HTTPMethod.Delete,
      `project/${this.getProjectSlug()}/checkout-key/${fingerprint}`,
      200
    );
  }

  /**
   * Returns an individual checkout key.
   */
  async getCheckoutKey(fingerprint: string): Promise<CheckoutKey> {
    const data = await this.request(
      HTTPMethod.Get,
      `project/${this.getProjectSlug()}/checkout-key/${fingerprint}`,
      200
    );

    return data as CheckoutKey;
  }

  /**
   * List all environment variables (masked).
   */
  async listEnvVars({
    pageToken,
  }: {
    pageToken?: string;
  } = {}): Promise<Paged<EnvVar>> {
    const params: Params = {};
    if (pageToken) {
      params['page-token'] = pageToken;
    }

    const data = await this.request(
      HTTPMethod.Get,
      `project/${this.getProjectSlug()}/envvar`,
      200,
      params
    );

    return data as Paged<EnvVar>;
  }

  /**
   * Returns the masked value of an environment variable.
   */
  async getEnvVar(name: string): Promise<EnvVar> {
    const data = await this.request(
      HTTPMethod.Get,
      `project/${this.getProjectSlug()}/envvar/${encodeURIComponent(name)}`,
      200
    );

    return data as EnvVar;
  }

  /**
   * Creates a new environment variable.
   */
  async createEnvVar(name: string, value: string): Promise<EnvVar> {
    const data = await this.request(
      HTTPMethod.Post,
      `project/${this.getProjectSlug()}/envvar`,
      201,
      {
        name,
        value,
      }
    );

    return data as EnvVar;
  }

  /**
   * Deletes the environment variable named.
   */
  async deleteEnvVar(name: string): Promise<void> {
    await this.request(
      HTTPMethod.Delete,
      `project/${this.getProjectSlug()}/envvar/${encodeURIComponent(name)}`,
      200
    );
  }

  /**
   * Returns summary fields of a workflow by ID.
   */
  async getWorkflow(id: string): Promise<Workflow> {
    const data = await this.request(
      HTTPMethod.Get,
      `workflow/${encodeURIComponent(id)}`,
      200
    );

    return data as Workflow;
  }

  /**
   * Cancels a running workflow.
   */
  async cancelWorkflow(id: string): Promise<void> {
    await this.request(
      HTTPMethod.Post,
      `workflow/${encodeURIComponent(id)}/cancel`,
      202
    );
  }

  /**
   * Reruns a workflow.
   */
  async rerunWorkflow(
    workflowId: string,
    { jobs, fromFailed }: { jobs?: string[]; fromFailed?: boolean } = {}
  ): Promise<void> {
    const params: Params = {};

    if (jobs) {
      params.jobs = jobs;
    }

    if (fromFailed) {
      params.fromFailed = fromFailed;
    }

    await this.request(
      HTTPMethod.Post,
      `workflow/${encodeURIComponent(workflowId)}/rerun`,
      202,
      params
    );
  }

  /**
   * Approves a pending approval job in a workflow.
   */
  async approveWorkflowJob(
    workflowId: string,
    requestId: string
  ): Promise<void> {
    await this.request(
      HTTPMethod.Post,
      `workflow/${encodeURIComponent(workflowId)}/approve/${requestId}`,
      202
    );
  }

  /**
   * Returns a sequence of jobs for a workflow.
   */
  async listWorkflowJobs(
    id: string,
    {
      pageToken,
    }: {
      pageToken?: string;
    } = {}
  ): Promise<Paged<Job>> {
    const params: Params = {};
    if (pageToken) {
      params['page-token'] = pageToken;
    }

    const data = await this.request(
      HTTPMethod.Get,
      `workflow/${encodeURIComponent(id)}/job`,
      200,
      params
    );

    return data as Paged<Job>;
  }

  /**
   * Get summary metrics for a project's workflows.
   */
  async listWorkflowMetrics({
    pageToken,
    branch,
  }: {
    pageToken?: string;
    branch?: string;
  } = {}): Promise<Paged<SummaryMetrics>> {
    const params: Params = {};
    if (pageToken) {
      params['page-token'] = pageToken;
    }
    if (branch || this.branch) {
      params['branch'] = branch || this.branch!;
    }

    const data = await this.request(
      HTTPMethod.Get,
      `insights/${this.getProjectSlug()}/workflows`,
      200,
      params
    );

    return data as Paged<SummaryMetrics>;
  }

  /**
   * Get summary metrics for a project workflow's jobs.
   */
  async listWorkflowJobMetrics(
    workflowName: string,
    {
      pageToken,
      branch,
    }: {
      pageToken?: string;
      branch?: string;
    } = {}
  ): Promise<Paged<SummaryMetrics>> {
    const params: Params = {};
    if (pageToken) {
      params['page-token'] = pageToken;
    }
    if (branch || this.branch) {
      params['branch'] = branch || this.branch!;
    }

    const data = await this.request(
      HTTPMethod.Get,
      `insights/${this.getProjectSlug()}/workflows/${workflowName}/jobs`,
      200,
      params
    );

    return data as Paged<SummaryMetrics>;
  }

  /**
   * Get recent runs of a workflow.
   */
  async listWorkflowRuns(
    workflowName: string,
    {
      pageToken,
      branch,
      startDate,
      endDate,
    }: {
      pageToken?: string;
      branch?: string;
      startDate?: string;
      endDate?: string;
    } = {}
  ): Promise<Paged<WorkflowRun>> {
    const params: Params = {};
    if (pageToken) {
      params['page-token'] = pageToken;
    }
    if (branch || this.branch) {
      params['branch'] = branch || this.branch!;
    }
    if (startDate) {
      params['start-date'] = startDate;
    }
    if (endDate) {
      params['end-date'] = endDate;
    }

    const data = await this.request(
      HTTPMethod.Get,
      `insights/${this.getProjectSlug()}/workflows/${workflowName}`,
      200,
      params
    );

    return data as Paged<WorkflowRun>;
  }

  /**
   * Get recent runs of a job within a workflow.
   */
  async listWorkflowJobRuns(
    workflowName: string,
    jobName: string,
    {
      pageToken,
      branch,
      startDate,
      endDate,
    }: {
      pageToken?: string;
      branch?: string;
      startDate?: string;
      endDate?: string;
    } = {}
  ): Promise<Paged<WorkflowRun>> {
    const params: Params = {};
    if (pageToken) {
      params['page-token'] = pageToken;
    }
    if (branch || this.branch) {
      params['branch'] = branch || this.branch!;
    }
    if (startDate) {
      params['start-date'] = startDate;
    }
    if (endDate) {
      params['end-date'] = endDate;
    }

    const data = await this.request(
      HTTPMethod.Get,
      `insights/${this.getProjectSlug()}/workflows/${workflowName}/jobs/${jobName}`,
      200,
      params
    );

    return data as Paged<WorkflowRun>;
  }

  /**
   * Returns all pipelines for the most recently built projects
   * you follow in an organization.
   */
  async listPipelines(
    orgSlug: string,
    {
      pageToken,
      onlyMine,
    }: {
      pageToken?: string;
      onlyMine?: boolean;
    } = {}
  ): Promise<Paged<Pipeline>> {
    const params: Params = {
      'org-slug': orgSlug,
    };
    if (pageToken) {
      params['page-token'] = pageToken;
    }
    if (onlyMine) {
      params['mine'] = onlyMine;
    }

    const data = await this.request(HTTPMethod.Get, `pipeline`, 200, params);

    return data as Paged<Pipeline>;
  }

  /**
   * Returns a pipeline by ID.
   */
  async getPipeline(pipelineId: string): Promise<Pipeline> {
    const data = await this.request(
      HTTPMethod.Get,
      `pipeline/${pipelineId}`,
      200
    );

    return data as Pipeline;
  }

  /**
   * Returns a pipeline's configuration by ID.
   */
  async getPipelineConfig(pipelineId: string): Promise<PipelineConfig> {
    const data = await this.request(
      HTTPMethod.Get,
      `pipeline/${pipelineId}/config`,
      200
    );

    return data as PipelineConfig;
  }

  /**
   * Returns a paginated list of workflows by pipeline ID.
   */
  async listPipelineWorkflows(
    pipelineId: string,
    {
      pageToken,
    }: {
      pageToken?: string;
    } = {}
  ): Promise<Paged<Workflow>> {
    const params: Params = {};
    if (pageToken) {
      params['page-token'] = pageToken;
    }

    const data = await this.request(
      HTTPMethod.Get,
      `pipeline/${pipelineId}/workflow`,
      200,
      params
    );

    return data as Paged<Workflow>;
  }

  /**
   * Triggers a new pipeline on the project.
   */
  async triggerProjectPipeline({
    branch,
    tag,
    parameters,
  }: {
    branch?: string;
    tag?: string;
    parameters?: { [key: string]: string | number | boolean };
  }): Promise<PipelineConfig> {
    const params: Params = {};
    if (branch || this.branch) {
      params['branch'] = branch || this.branch!;
    }
    if (tag) {
      params['tag'] = tag;
    }
    if (parameters) {
      params['parameters'] = parameters;
    }

    const data = await this.request(
      HTTPMethod.Post,
      `project/${this.getProjectSlug()}/pipeline`,
      201,
      params
    );

    return data as PipelineConfig;
  }

  /**
   * Returns all pipelines for this project.
   */
  async listProjectPipelines({
    pageToken,
    branch,
  }: {
    pageToken?: string;
    branch?: string;
  } = {}): Promise<Paged<Pipeline>> {
    const params: Params = {};
    if (pageToken) {
      params['page-token'] = pageToken;
    }
    if (branch || this.branch) {
      params['branch'] = branch || this.branch!;
    }

    const data = await this.request(
      HTTPMethod.Get,
      `project/${this.getProjectSlug()}/pipeline`,
      200,
      params
    );

    return data as Paged<Pipeline>;
  }

  /**
   * Returns a sequence of all pipelines for this
   * project triggered by the user.
   */
  async listOwnProjectPipelines({
    pageToken,
  }: {
    pageToken?: string;
  } = {}): Promise<Paged<Pipeline>> {
    const params: Params = {};
    if (pageToken) {
      params['page-token'] = pageToken;
    }

    const data = await this.request(
      HTTPMethod.Get,
      `project/${this.getProjectSlug()}/pipeline/mine`,
      200,
      params
    );

    return data as Paged<Pipeline>;
  }

  /**
   * Returns a pipeline by number.
   */
  async getProjectPipeline(pipelineNumber: string | number): Promise<Pipeline> {
    const data = await this.request(
      HTTPMethod.Get,
      `project/${this.getProjectSlug()}/pipeline/${pipelineNumber}`,
      200
    );

    return data as Pipeline;
  }

  /**
   * Returns job details.
   */
  async getJob(jobNumber: string | number): Promise<JobDetail> {
    this.previewWarn();

    const data = await this.request(
      HTTPMethod.Get,
      `project/${this.getProjectSlug()}/job/${jobNumber}`,
      200
    );

    return data as JobDetail;
  }

  /**
   * Cancel job with a given job number.
   */
  async cancelJob(jobNumber: string | number): Promise<void> {
    this.previewWarn();

    await this.request(
      HTTPMethod.Post,
      `project/${this.getProjectSlug()}/job/${jobNumber}/cancel`,
      202
    );
  }

  /**
   * Returns a job's artifacts.
   */
  async listJobArtifacts(
    jobNumber: string | number,
    {
      pageToken,
    }: {
      pageToken?: string;
    } = {}
  ): Promise<Paged<JobArtifact>> {
    this.previewWarn();

    const params: Params = {};
    if (pageToken) {
      params['page-token'] = pageToken;
    }

    const data = await this.request(
      HTTPMethod.Get,
      `project/${this.getProjectSlug()}/${jobNumber}/artifacts`,
      200,
      params
    );

    return data as Paged<JobArtifact>;
  }

  /**
   * Get test metadata for a build.
   */
  async listJobTests(
    jobNumber: string | number,
    {
      pageToken,
    }: {
      pageToken?: string;
    } = {}
  ): Promise<Paged<JobTest>> {
    this.previewWarn();

    const params: Params = {};
    if (pageToken) {
      params['page-token'] = pageToken;
    }

    const data = await this.request(
      HTTPMethod.Get,
      `project/${this.getProjectSlug()}/${jobNumber}/tests`,
      200,
      params
    );

    return data as Paged<JobTest>;
  }

  /**
   * Information about the user that is currently signed in.
   */
  async getMe(): Promise<User> {
    this.previewWarn();

    const data = await this.request(HTTPMethod.Get, `me`, 200);

    return data as User;
  }

  /**
   * Provides the set of organizations of which the currently
   * signed in user is a member or a collaborator.
   */
  async getCollaborations(): Promise<Collaboration[]> {
    this.previewWarn();

    const data = await this.request(HTTPMethod.Get, `me/collaborations`, 200);

    return data as Collaboration[];
  }

  /**
   * Information about the user with the given ID.
   */
  async getUser(userId: string): Promise<User> {
    this.previewWarn();

    const data = await this.request(HTTPMethod.Get, `user/${userId}`, 200);

    return data as User;
  }

  /**
   * List all contexts for an owner.
   */
  async listContexts({
    ownerId,
    ownerSlug,
    ownerType,
    pageToken,
  }: {
    ownerId?: string;
    ownerSlug?: string;
    ownerType?: 'account' | 'organization';
    pageToken?: string;
  }): Promise<Paged<Context>> {
    this.previewWarn();

    if ((!ownerId && !ownerSlug) || (ownerId && ownerSlug)) {
      throw new ArgumentError('One of ownerId or ownerSlug must be supplied');
    }

    const params: Params = {};
    if (pageToken) {
      params['page-token'] = pageToken;
    }
    if (ownerId) {
      params['owner-id'] = ownerId;
    }
    if (ownerSlug) {
      params['owner-slug'] = ownerSlug;
    }
    if (ownerType) {
      params['owner-type'] = ownerType;
    }

    const data = await this.request(HTTPMethod.Get, `context`, 200, params);

    return data as Paged<Context>;
  }

  /**
   * Create a new context.
   */
  async createContext(
    name: string,
    owner: { id: string; type?: 'account' | 'organization' }
  ): Promise<Context> {
    const data = await this.request(HTTPMethod.Post, `context`, 200, {
      name,
      owner,
    });

    return data as Context;
  }

  /**
   * Delete a context.
   */
  async deleteContext(contextId: string): Promise<void> {
    await this.request(HTTPMethod.Delete, `context/${contextId}`, 200);
  }

  /**
   * Returns basic information about a context.
   */
  async getContext(contextId: string): Promise<Context> {
    this.previewWarn();

    const data = await this.request(
      HTTPMethod.Get,
      `context/${contextId}`,
      200
    );

    return data as Context;
  }

  /**
   * List information about environment variables in a context,
   * not including their values.
   */
  async listContextEnvVars(
    contextId: string,
    {
      pageToken,
    }: {
      pageToken?: string;
    } = {}
  ): Promise<Paged<ContextEnvVar>> {
    const params: Params = {};
    if (pageToken) {
      params['page-token'] = pageToken;
    }

    const data = await this.request(
      HTTPMethod.Get,
      `context/${contextId}/environment-variable`,
      200,
      params
    );

    return data as Paged<ContextEnvVar>;
  }

  /**
   * Create or update an environment variable within a context.
   */
  async createContextEnvVar(
    contextId: string,
    name: string,
    value: string
  ): Promise<EnvVar> {
    const data = await this.request(
      HTTPMethod.Put,
      `context/${contextId}/environment-variable/${name}`,
      200,
      {
        value,
      }
    );

    return data as EnvVar;
  }

  /**
   * Delete an environment variable from a context.
   */
  async deleteContextEnvVar(contextId: string, name: string): Promise<void> {
    await this.request(
      HTTPMethod.Delete,
      `context/${contextId}/environment-variable/${name}`,
      200
    );
  }
}

export default CircleCI;
