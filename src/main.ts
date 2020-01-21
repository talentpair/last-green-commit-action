import * as core from "@actions/core";
import { context, GitHub } from "@actions/github";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleError(err: any): void {
  console.error(err);

  if (err && err.message) {
    core.setFailed(err.message);
  } else {
    core.setFailed(`Unhandled error: ${err}`);
  }
}

process.on("unhandledRejection", handleError);

async function run(): Promise<void> {
  const token = core.getInput("github-token", { required: true });
  const client = new GitHub(token);

  const branch = context.ref.replace("refs/heads/", "");

  const { data: commits } = await client.repos.listCommits({
    owner: context.repo.owner,
    repo: context.repo.repo,
    sha: branch
  });
  core.info(`Number of commits: ${commits.length}`);

  let result = "";
  for (const { sha } of commits) {
    const {
      data: { check_suites: checkSuites }
    } = await client.checks.listSuitesForRef({
      owner: context.repo.owner,
      repo: context.repo.repo,
      ref: sha
    });
    const success = checkSuites.find(
      c => c.status === "completed" && c.conclusion === "success"
    );
    if (success) {
      result = success.head_sha;
      break;
    }
  }
  core.info(`Commit: ${result}`);

  core.setOutput("result", result);
}

run().catch(handleError);
