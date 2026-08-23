import { Router, type IRouter } from "express";
import { ReplitConnectors } from "@replit/connectors-sdk";
import type { ProxyOptions } from "@replit/connectors-sdk";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import {
  GetGithubStatusResponse,
  PushAppToGithubBody,
  PushAppToGithubResponse,
  PushProjectToGithubBody,
  PushProjectToGithubResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();
const connectors = new ReplitConnectors();

async function github(path: string, init?: ProxyOptions) {
  return connectors.proxy("github", path, init);
}

async function collectAppFiles() {
  const candidates = [
    path.resolve(process.cwd()),
    path.resolve(process.cwd(), "../.."),
    "/home/runner/workspace",
  ];
  const root = candidates.find((candidate) => existsSync(path.join(candidate, "artifacts/jevish-ai-builder"))) ?? candidates[0];
  const relativeRoots = [
    "artifacts/jevish-ai-builder",
    "artifacts/api-server",
    "lib/api-spec",
    "lib/api-client-react",
    "lib/api-zod",
    "lib/db",
  ];
  const rootFiles = ["package.json", "pnpm-workspace.yaml", "pnpm-lock.yaml", "tsconfig.json", "tsconfig.base.json", "replit.md"];
  const ignored = new Set(["node_modules", "dist", ".vite", ".cache"]);
  const files: Array<{ path: string; content: string }> = [];

  async function walk(relativeDir: string) {
    const entries = await readdir(path.join(root, relativeDir), { withFileTypes: true });
    for (const entry of entries) {
      if (ignored.has(entry.name)) continue;
      const relativePath = path.join(relativeDir, entry.name);
      if (entry.isDirectory()) {
        await walk(relativePath);
      } else if (!entry.name.endsWith(".map") && !entry.name.endsWith(".tsbuildinfo")) {
        files.push({ path: relativePath.split(path.sep).join("/"), content: await readFile(path.join(root, relativePath), "utf8") });
      }
    }
  }

  for (const relativeRoot of relativeRoots) {
    if (existsSync(path.join(root, relativeRoot))) await walk(relativeRoot);
  }
  for (const file of rootFiles) {
    if (existsSync(path.join(root, file))) files.push({ path: file, content: await readFile(path.join(root, file), "utf8") });
  }
  return files;
}

router.get("/github/status", async (req, res) => {
  try {
    const response = await github("/user");
    if (!response.ok) {
      res.json(GetGithubStatusResponse.parse({
        connected: false,
        login: null,
        message: "Connect GitHub in Settings to publish your project.",
      }));
      return;
    }
    const user = (await response.json()) as { login?: string };
    res.json(GetGithubStatusResponse.parse({
      connected: true,
      login: user.login ?? null,
      message: "GitHub is ready for publishing.",
    }));
  } catch (error) {
    req.log.error({ err: error }, "GitHub status check failed");
    res.json({ connected: false, login: null, message: "Connect GitHub in Settings to publish your project." });
  }
});

router.post("/github/push-app", async (req, res) => {
  const parsed = PushAppToGithubBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Add a repository name and commit message." });
    return;
  }

  try {
    const meResponse = await github("/user");
    if (!meResponse.ok) {
      res.status(401).json({ error: "Connect GitHub in Settings before publishing." });
      return;
    }
    const me = (await meResponse.json()) as { login: string };
    const repoName = parsed.data.repository.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
    let repoResponse = await github("/user/repos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: repoName,
        description: parsed.data.description || "JEVISH AI Builder — build with ideas",
        private: parsed.data.private ?? false,
        auto_init: true,
      }),
    });
    if (repoResponse.status === 422) {
      repoResponse = await github(`/repos/${encodeURIComponent(me.login)}/${encodeURIComponent(repoName)}`);
    }
    if (!repoResponse.ok) {
      req.log.error({ status: repoResponse.status }, "GitHub app repository creation failed");
      res.status(500).json({ error: "GitHub could not create that repository." });
      return;
    }

    const repo = (await repoResponse.json()) as { html_url: string; default_branch?: string };
    const branch = repo.default_branch ?? "main";
    const files = await collectAppFiles();
    let commitUrl: string | null = null;
    for (const file of files) {
      let sha: string | undefined;
      const existingResponse = await github(
        `/repos/${encodeURIComponent(me.login)}/${encodeURIComponent(repoName)}/contents/${file.path.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(branch)}`,
      );
      if (existingResponse.ok) {
        const existing = (await existingResponse.json()) as { sha?: string };
        sha = existing.sha;
      }
      const updateResponse = await github(
        `/repos/${encodeURIComponent(me.login)}/${encodeURIComponent(repoName)}/contents/${file.path.split("/").map(encodeURIComponent).join("/")}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: parsed.data.commitMessage,
            content: Buffer.from(file.content, "utf8").toString("base64"),
            branch,
            ...(sha ? { sha } : {}),
          }),
        },
      );
      if (!updateResponse.ok) {
        req.log.error({ status: updateResponse.status, path: file.path }, "GitHub app file push failed");
        res.status(500).json({ error: `GitHub could not publish ${file.path}.` });
        return;
      }
      const update = (await updateResponse.json()) as { commit?: { html_url?: string } };
      commitUrl = update.commit?.html_url ?? commitUrl;
    }
    res.json(PushAppToGithubResponse.parse({
      repositoryUrl: repo.html_url,
      commitUrl,
      message: `Published the JEVISH AI Builder app to ${me.login}/${repoName}.`,
      filesPublished: files.length,
    }));
  } catch (error) {
    req.log.error({ err: error }, "GitHub app push failed");
    res.status(500).json({ error: "GitHub could not publish the JEVISH AI Builder app." });
  }
});

router.post("/github/push", async (req, res) => {
  const parsed = PushProjectToGithubBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Add a repository name and at least one project file." });
    return;
  }

  try {
    const meResponse = await github("/user");
    if (!meResponse.ok) {
      res.status(401).json({ error: "Connect GitHub in Settings before publishing." });
      return;
    }
    const me = (await meResponse.json()) as { login: string };
    const repoName = parsed.data.repository.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
    let repoResponse = await github("/user/repos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: repoName,
        description: parsed.data.description || "Built with JEVISH AI Builder",
        private: parsed.data.private ?? false,
        auto_init: true,
      }),
    });

    if (repoResponse.status === 422) {
      repoResponse = await github(`/repos/${encodeURIComponent(me.login)}/${encodeURIComponent(repoName)}`);
    }
    if (!repoResponse.ok) {
      req.log.error({ status: repoResponse.status }, "GitHub repository creation failed");
      res.status(repoResponse.status === 401 ? 401 : 500).json({ error: "GitHub could not create that repository." });
      return;
    }

    const repo = (await repoResponse.json()) as { html_url: string; default_branch?: string };
    const branch = repo.default_branch ?? "main";
    let commitUrl: string | null = null;
    for (const file of parsed.data.files) {
      let sha: string | undefined;
      const existingResponse = await github(
        `/repos/${encodeURIComponent(me.login)}/${encodeURIComponent(repoName)}/contents/${file.path.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(branch)}`,
      );
      if (existingResponse.ok) {
        const existing = (await existingResponse.json()) as { sha?: string };
        sha = existing.sha;
      }

      const updateResponse = await github(
        `/repos/${encodeURIComponent(me.login)}/${encodeURIComponent(repoName)}/contents/${file.path.split("/").map(encodeURIComponent).join("/")}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: parsed.data.commitMessage,
            content: Buffer.from(file.content, "utf8").toString("base64"),
            branch,
            ...(sha ? { sha } : {}),
          }),
        },
      );
      if (!updateResponse.ok) {
        req.log.error({ status: updateResponse.status, path: file.path }, "GitHub file push failed");
        res.status(500).json({ error: `GitHub could not publish ${file.path}.` });
        return;
      }
      const update = (await updateResponse.json()) as { commit?: { html_url?: string } };
      commitUrl = update.commit?.html_url ?? commitUrl;
    }

    res.json(PushProjectToGithubResponse.parse({
      repositoryUrl: repo.html_url,
      commitUrl,
      message: `Published ${parsed.data.files.length} files to ${me.login}/${repoName}.`,
    }));
  } catch (error) {
    req.log.error({ err: error }, "GitHub push failed");
    res.status(500).json({ error: "GitHub could not publish this project." });
  }
});

export default router;