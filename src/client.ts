import { https } from 'follow-redirects';
import { createWriteStream } from 'fs';
import fetch from 'isomorphic-fetch';
import { join } from 'path';
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
  vcs_type: string;
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

export const CIRCLE_CI_URL = 'https://circleci.com';
export const API_BASE_PATH = '/api/v2';

class CircleCI {
  public slug?: ProjectSlug | string;
  public branch?: string;
  private baseUrl: string;
  private previewWarned: string[] = [];
  private headers: Headers = {};

  constructor(
    private readonly apiKey: string,
    {
      slug,
      branch,
      baseUrl = CIRCLE_CI_URL,
      headers = {},
    }: {
      slug?: ProjectSlug | string;
      branch?: string;
      baseUrl?: string;
      headers?: Headers;
    } = {}
  ) {
    this.slug = slug;
    this.branch = branch;
    this.baseUrl = baseUrl;
    this.headers = {
      ...headers,
      'Circle-Token': this.apiKey,
      'X-Circle-Client': `v${pck.version}`,
    };
  }

  private async request<TData = { [value: string]: any }>(
    method: HTTPMethod,
    path: string,
    successStatus: number,
    params?: Params
  ): Promise<TData> {
    let fullPath = `${this.baseUrl}/${API_BASE_PATH}/${path}`;
    let body: string | undefined = undefined;
    if (params && Object.keys(params).length) {
      if ([HTTPMethod.Get, HTTPMethod.Delete].includes(method)) {
        fullPath += `?${new URLSearchParams(
          params as { [value: string]: string }
        )}`;
      }

      if ([HTTPMethod.Post, HTTPMethod.Put].includes(method)) {
        body = JSON.stringify(params);
        this.headers['Content-Type'] = 'application/json';
      }
    }

    const response = await fetch(fullPath, {
      method,
      headers: this.headers,
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

    return data as TData;
  }

  private previewWarn(method: string): void {
    if (this.previewWarned.includes(method)) {
      return;
    }

    console.warn(
      `⚠️ Method ${method} calls a preview API endpoint that may change at any time.`
    );
    this.previewWarned.push(method);
  }

  getProjectSlug(): string {
    if (!this.slug) {
      throw new ProjectSlugError();
    }

    return encodeURIComponent(
      Array.isArray(this.slug) ? this.slug.join('/') : this.slug
    );
  }

  /**
   * Retrieves a project by project slug.
   */
  async getProject(): Promise<Project> {
    return await this.request<Project>(
      HTTPMethod.Get,
      `/project/${this.getProjectSlug()}`,
      200
    );
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

    return await this.request<Paged<CheckoutKey>>(
      HTTPMethod.Get,
      `/project/${this.getProjectSlug()}/checkout-key`,
      200,
      params
    );
  }

  /**
   * Creates a new checkout key.
   */
  async createCheckoutKey(
    type: 'user-key' | 'deploy-key'
  ): Promise<CheckoutKey> {
    return await this.request<CheckoutKey>(
      HTTPMethod.Post,
      `/project/${this.getProjectSlug()}/checkout-key`,
      201,
      { type }
    );
  }

  /**
   * Deletes the checkout key.
   */
  async deleteCheckoutKey(fingerprint: string): Promise<void> {
    await this.request(
      HTTPMethod.Delete,
      `/project/${this.getProjectSlug()}/checkout-key/${fingerprint}`,
      200
    );
  }

  /**
   * Returns an individual checkout key.
   */
  async getCheckoutKey(fingerprint: string): Promise<CheckoutKey> {
    return await this.request<CheckoutKey>(
      HTTPMethod.Get,
      `/project/${this.getProjectSlug()}/checkout-key/${fingerprint}`,
      200
    );
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

    return await this.request<Paged<EnvVar>>(
      HTTPMethod.Get,
      `/project/${this.getProjectSlug()}/envvar`,
      200,
      params
    );
  }

  /**
   * Returns the masked value of an environment variable.
   */
  async getEnvVar(name: string): Promise<EnvVar> {
    return await this.request<EnvVar>(
      HTTPMethod.Get,
      `/project/${this.getProjectSlug()}/envvar/${encodeURIComponent(name)}`,
      200
    );
  }

  /**
   * Creates a new environment variable.
   */
  async createEnvVar(name: string, value: string): Promise<EnvVar> {
    return await this.request<EnvVar>(
      HTTPMethod.Post,
      `/project/${this.getProjectSlug()}/envvar`,
      201,
      {
        name,
        value,
      }
    );
  }

  /**
   * Deletes the environment variable named.
   */
  async deleteEnvVar(name: string): Promise<void> {
    await this.request(
      HTTPMethod.Delete,
      `/project/${this.getProjectSlug()}/envvar/${encodeURIComponent(name)}`,
      200
    );
  }

  /**
   * Returns summary fields of a workflow by ID.
   */
  async getWorkflow(id: string): Promise<Workflow> {
    return await this.request<Workflow>(
      HTTPMethod.Get,
      `/workflow/${encodeURIComponent(id)}`,
      200
    );
  }

  /**
   * Cancels a running workflow.
   */
  async cancelWorkflow(id: string): Promise<void> {
    await this.request(
      HTTPMethod.Post,
      `/workflow/${encodeURIComponent(id)}/cancel`,
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
      `/workflow/${encodeURIComponent(workflowId)}/rerun`,
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
      `/workflow/${encodeURIComponent(workflowId)}/approve/${requestId}`,
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

    return await this.request<Paged<Job>>(
      HTTPMethod.Get,
      `/workflow/${encodeURIComponent(id)}/job`,
      200,
      params
    );
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
      params['branch'] = branch || this.branch;
    }

    return await this.request<Paged<SummaryMetrics>>(
      HTTPMethod.Get,
      `/insights/${this.getProjectSlug()}/workflows`,
      200,
      params
    );
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
      params['branch'] = branch || this.branch;
    }

    return await this.request<Paged<SummaryMetrics>>(
      HTTPMethod.Get,
      `/insights/${this.getProjectSlug()}/workflows/${workflowName}/jobs`,
      200,
      params
    );
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
      params['branch'] = branch || this.branch;
    }
    if (startDate) {
      params['start-date'] = startDate;
    }
    if (endDate) {
      params['end-date'] = endDate;
    }

    return await this.request<Paged<WorkflowRun>>(
      HTTPMethod.Get,
      `/insights/${this.getProjectSlug()}/workflows/${workflowName}`,
      200,
      params
    );
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
      params['branch'] = branch || this.branch;
    }
    if (startDate) {
      params['start-date'] = startDate;
    }
    if (endDate) {
      params['end-date'] = endDate;
    }

    return await this.request<Paged<WorkflowRun>>(
      HTTPMethod.Get,
      `/insights/${this.getProjectSlug()}/workflows/${workflowName}/jobs/${jobName}`,
      200,
      params
    );
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

    return await this.request<Paged<Pipeline>>(
      HTTPMethod.Get,
      '/pipeline',
      200,
      params
    );
  }

  /**
   * Returns a pipeline by ID.
   */
  async getPipeline(pipelineId: string): Promise<Pipeline> {
    return await this.request<Pipeline>(
      HTTPMethod.Get,
      `/pipeline/${pipelineId}`,
      200
    );
  }

  /**
   * Returns a pipeline's configuration by ID.
   */
  async getPipelineConfig(pipelineId: string): Promise<PipelineConfig> {
    return await this.request<PipelineConfig>(
      HTTPMethod.Get,
      `/pipeline/${pipelineId}/config`,
      200
    );
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

    return await this.request<Paged<Workflow>>(
      HTTPMethod.Get,
      `/pipeline/${pipelineId}/workflow`,
      200,
      params
    );
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
      params['branch'] = branch || this.branch;
    }
    if (tag) {
      params['tag'] = tag;
    }
    if (parameters) {
      params['parameters'] = parameters;
    }

    return await this.request<PipelineConfig>(
      HTTPMethod.Post,
      `/project/${this.getProjectSlug()}/pipeline`,
      201,
      params
    );
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
      params['branch'] = branch || this.branch;
    }

    return await this.request<Paged<Pipeline>>(
      HTTPMethod.Get,
      `/project/${this.getProjectSlug()}/pipeline`,
      200,
      params
    );
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

    return await this.request<Paged<Pipeline>>(
      HTTPMethod.Get,
      `/project/${this.getProjectSlug()}/pipeline/mine`,
      200,
      params
    );
  }

  /**
   * Returns a pipeline by number.
   */
  async getProjectPipeline(pipelineNumber: string | number): Promise<Pipeline> {
    return await this.request<Pipeline>(
      HTTPMethod.Get,
      `/project/${this.getProjectSlug()}/pipeline/${pipelineNumber}`,
      200
    );
  }

  /**
   * Returns job details.
   *
   * This is a preview API endpoint that may change at any time.
   */
  async getJob(jobNumber: string | number): Promise<JobDetail> {
    this.previewWarn('getJob');

    return await this.request<JobDetail>(
      HTTPMethod.Get,
      `/project/${this.getProjectSlug()}/job/${jobNumber}`,
      200
    );
  }

  /**
   * Cancel job with a given job number.
   *
   * This is a preview API endpoint that may change at any time.
   */
  async cancelJob(jobNumber: string | number): Promise<void> {
    this.previewWarn('cancelJob');

    await this.request(
      HTTPMethod.Post,
      `/project/${this.getProjectSlug()}/job/${jobNumber}/cancel`,
      202
    );
  }

  /**
   * Returns a job's artifacts.
   *
   * This is a preview API endpoint that may change at any time.
   */
  async listJobArtifacts(
    jobNumber: string | number,
    {
      pageToken,
    }: {
      pageToken?: string;
    } = {}
  ): Promise<Paged<JobArtifact>> {
    this.previewWarn('listJobArtifacts');

    const params: Params = {};
    if (pageToken) {
      params['page-token'] = pageToken;
    }

    return await this.request<Paged<JobArtifact>>(
      HTTPMethod.Get,
      `/project/${this.getProjectSlug()}/${jobNumber}/artifacts`,
      200,
      params
    );
  }

  /**
   * Get test metadata for a build.
   *
   * This is a preview API endpoint that may change at any time.
   */
  async listJobTests(
    jobNumber: string | number,
    {
      pageToken,
    }: {
      pageToken?: string;
    } = {}
  ): Promise<Paged<JobTest>> {
    this.previewWarn('listJobTests');

    const params: Params = {};
    if (pageToken) {
      params['page-token'] = pageToken;
    }

    return await this.request<Paged<JobTest>>(
      HTTPMethod.Get,
      `/project/${this.getProjectSlug()}/${jobNumber}/tests`,
      200,
      params
    );
  }

  /**
   * Information about the user that is currently signed in.
   *
   * This is a preview API endpoint that may change at any time.
   */
  async getMe(): Promise<User> {
    this.previewWarn('getMe');

    return await this.request<User>(HTTPMethod.Get, '/me', 200);
  }

  /**
   * Provides the set of organizations of which the currently
   * signed in user is a member or a collaborator.
   *
   * This is a preview API endpoint that may change at any time.
   */
  async getCollaborations(): Promise<Collaboration[]> {
    this.previewWarn('getCollaborations');

    return await this.request<Collaboration[]>(
      HTTPMethod.Get,
      '/me/collaborations',
      200
    );
  }

  /**
   * Information about the user with the given ID.
   *
   * This is a preview API endpoint that may change at any time.
   */
  async getUser(userId: string): Promise<User> {
    this.previewWarn('getUser');

    return await this.request<User>(HTTPMethod.Get, `/user/${userId}`, 200);
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

    return await this.request<Paged<Context>>(
      HTTPMethod.Get,
      '/context',
      200,
      params
    );
  }

  /**
   * Create a new context.
   */
  async createContext(
    name: string,
    owner: { id: string; type?: 'account' | 'organization' }
  ): Promise<Context> {
    return await this.request<Context>(HTTPMethod.Post, '/context', 200, {
      name,
      owner,
    });
  }

  /**
   * Delete a context.
   */
  async deleteContext(contextId: string): Promise<void> {
    await this.request(HTTPMethod.Delete, `/context/${contextId}`, 200);
  }

  /**
   * Returns basic information about a context.
   */
  async getContext(contextId: string): Promise<Context> {
    return await this.request<Context>(
      HTTPMethod.Get,
      `/context/${contextId}`,
      200
    );
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

    return await this.request<Paged<ContextEnvVar>>(
      HTTPMethod.Get,
      `/context/${contextId}/environment-variable`,
      200,
      params
    );
  }

  /**
   * Create or update an environment variable within a context.
   */
  async createContextEnvVar(
    contextId: string,
    name: string,
    value: string
  ): Promise<EnvVar> {
    return await this.request<EnvVar>(
      HTTPMethod.Put,
      `/context/${contextId}/environment-variable/${name}`,
      200,
      {
        value,
      }
    );
  }

  /**
   * Delete an environment variable from a context.
   */
  async deleteContextEnvVar(contextId: string, name: string): Promise<void> {
    await this.request(
      HTTPMethod.Delete,
      `/context/${contextId}/environment-variable/${name}`,
      200
    );
  }

  /**
   * Download a job artifact and save it to disk.
   */
  async downloadArtifact(
    artifact: JobArtifact | string,
    location?: string
  ): Promise<void> {
    const url = typeof artifact === 'string' ? artifact : artifact.url;
    location = location || join(process.cwd(), url.split('/').pop()!);
    return new Promise((resolve, reject) => {
      https
        .get(
          url,
          {
            headers: this.headers,
          },
          response =>
            response
              .on('end', resolve)
              .on('finish', resolve)
              .pipe(createWriteStream(location!))
        )
        .on('error', error => reject(error));
    });
  }
}

export default CircleCI;
