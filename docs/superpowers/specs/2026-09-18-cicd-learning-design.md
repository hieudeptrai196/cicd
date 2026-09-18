# CI/CD Learning Project — Jenkins + Harbor + Ansible

**Date:** 2026-09-18
**Purpose:** Hands-on lab + reference material to prepare for a DevOps/CI-CD interview. Prioritizes depth of understanding and coverage of failure/edge cases over speed of setup.

## Goals

- Build a working end-to-end CI/CD pipeline: code push → Jenkins CI → Harbor registry → Ansible CD → running container.
- Use Ansible for **both** infrastructure provisioning (install Docker, deploy Jenkins, deploy Harbor) and application deployment — demonstrates the tool's real scope, not just "a deploy script."
- Organize the repo the way real orgs split concerns: `infra/` (platform), `app/` (product code + CI definition), `deploy/` (release automation) — each independently understandable.
- Document concepts, the full pipeline flow, security practices, and — the priority — failure/edge cases, so the user can speak to them confidently in an interview.

## Non-goals

- No multi-node HA Jenkins/Harbor, no Kubernetes, no cloud-managed services. Single Ubuntu/Debian server, Docker-based, by explicit user choice.
- No production-grade secrets management (Vault server, KMS) — Ansible Vault + Jenkins Credentials Store is sufficient for a lab and is itself a valid interview topic.

## Architecture

Single server runs three logical groups of containers, isolated by Docker network/compose project: Jenkins (CI), Harbor (registry + scanner), and the sample app (target of CD). Ansible reaches the server over SSH — same host in this lab, but structured so `deploy/inventory` could point elsewhere with no code change (this distinction — inventory-driven targeting — is itself explained in docs as the reason Ansible scales from 1 to N hosts).

Flow: dev pushes to `app/` → Jenkins pipeline (`app/Jenkinsfile`) runs test → build → scan → push to Harbor, tagging images by git SHA (immutable artifacts, never `latest`) → Jenkins invokes `ansible-playbook deploy/playbook-deploy.yml` → Ansible pulls the new tag, recreates the app container, runs a health check, rolls back to the previous tag on failure.

## Repository layout

```
cicdlearning/
├── infra/        # Ansible: provision the server itself (Docker engine, Jenkins, Harbor)
├── app/          # Sample Node.js REST API + Dockerfile + Jenkinsfile
├── deploy/       # Ansible: deploy the app container, health-check, rollback
├── docs/         # Concepts, pipeline flow, security, failure cases, interview Q&A
└── README.md
```

## Key design decisions

- **Image tagging by git SHA, not `latest`**: makes every deploy traceable and rollback trivial (redeploy previous SHA).
- **Ansible idempotency**: every role/task is safe to re-run; documented explicitly since it's a common interview question ("what does idempotent mean and why does it matter here").
- **Harbor's built-in Trivy scanner**: pipeline queries scan results after push; a critical CVE fails the build (configurable threshold) — demonstrates shift-left security.
- **Health check + auto-rollback in the deploy role**: curl the app's `/health` endpoint after recreate; on failure, redeploy the previously-running tag (tracked via a marker file on the target host).
- **Secrets**: Harbor robot account credentials stored in Jenkins Credentials Store (not in Jenkinsfile); Ansible Vault for any secrets the deploy role needs on the target host.

## Documentation set (`docs/`)

1. `01-concepts.md` — CI vs CD, why each tool plays the role it does.
2. `02-pipeline-flow.md` — full sequence, stage by stage.
3. `03-security.md` — image scanning, credential handling, Ansible Vault.
4. `04-failure-cases.md` — build/test failure, CVE-blocked push, unreachable host, failed health check → rollback, Harbor disk/GC, Jenkins agent loss.
5. `05-interview-qa.md` — likely interview questions with prepared answers grounded in this lab.

## Validation

Run the provisioning playbook, configure Jenkins (plugins + Harbor credentials + pipeline job), trigger a build from `app/`, confirm: Jenkins build green → image visible in Harbor UI with scan result → container running on target → `curl` against the app's endpoint succeeds. This is also the walkthrough used to explain each step to the user.
