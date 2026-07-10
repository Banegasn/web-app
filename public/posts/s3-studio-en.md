---
id: "s3-studio-en"
title: "S3 Studio: Desktop S3 & CloudFront Manager Without a Hosted Backend"
summary: "S3 Studio is a source-available desktop client for managing Amazon S3 buckets, editing objects, inspecting permissions, and invalidating CloudFront from one focused workspace. No hosted backend, uses your existing AWS CLI profiles."
createdAt: "2026-07-10 12:00:00"
imageUrl: "images/s3-studio.png"
tags: "Amazon S3, AWS, CloudFront, S3 Browser, S3 File Manager, Desktop App, Tauri, DevOps, AWS CLI, Object Storage"
keywords: "S3 file manager, S3 browser desktop app, CloudFront invalidation tool, AWS S3 GUI client, manage S3 buckets desktop, S3 object editor, Tauri S3 client, source-available S3 tool"
language: "en"
translationGroup: "s3-studio"
---

# S3 Studio: Desktop S3 & CloudFront Manager Without a Hosted Backend

## One workspace for the entire S3 object lifecycle

**S3 Studio** is a **source-available** desktop client for managing Amazon S3 buckets, editing objects, inspecting permissions, and invalidating CloudFront from one focused workspace. No hosted backend, using your existing AWS CLI profiles.

**[👉 Visit S3 Studio](https://banegasn.github.io/s3-studio/)** — Explore the features, download the latest release, or review the source code on GitHub.

## The AWS console problem

Working with **Amazon S3** from the AWS console means constantly switching tabs: one to navigate buckets, another to edit objects, another to review permissions, another to invalidate **CloudFront**. Each operation opens a new context and breaks your workflow.

**S3 Studio** solves this by providing a single desktop workspace where navigation, content, context, and edge operations stay together. It's a **desktop S3 client** built with Tauri, React, and TypeScript that talks directly to AWS APIs with no intermediary service.

## What makes S3 Studio different

### Navigate the way S3 actually works

Browse visually when exploring, click any **breadcrumb** segment to jump back, or paste an exact prefix when you already know the destination. S3 Studio's browser respects S3's real prefix structure while presenting it in a familiar way.

### Transfer without losing context

Upload files or folders, drag from Finder or Explorer, download selections, and delete prefixes with visible progress. Transfer operations don't pull you out of your working context.

### Preview and edit in place

Inspect images and PDFs, open text and JSON in the **Monaco editor**, and save directly back to the selected S3 object. No download-edit-reupload cycle.

### Understand access without ACL noise

**Bucket ownership** and **policy controls** take the lead. Legacy ACL grants remain available on demand when they genuinely matter.

### Push changes to the edge

Find linked **CloudFront** distributions and create object, folder wildcard, or multi-selection invalidations beside the content.

<div style="text-align: center; margin: 1.5rem 0; padding: 1.5rem; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius: 12px;">
  <h2 style="margin-bottom: 1rem; color: #f8fafc; font-size: 1.4rem;">Try it on your desktop</h2>
  <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
    <a href="https://banegasn.github.io/s3-studio/" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #3b82f6; color: white; padding: 1.2rem 2.5rem; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 1.1rem; box-shadow: 0 4px 6px rgba(0,0,0,0.2); transition: transform 0.2s, box-shadow 0.2s;">
      🚀 Visit S3 Studio
    </a>
    <a href="https://github.com/Banegasn/s3-studio/releases/latest" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #1f2937; color: #f8fafc; padding: 1.2rem 2.5rem; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 1.1rem; box-shadow: 0 4px 6px rgba(0,0,0,0.2); transition: transform 0.2s, box-shadow 0.2s; border: 1px solid #374151;">
      ⬇️ Download latest release
    </a>
    <a href="https://github.com/Banegasn/s3-studio" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: transparent; color: #93c5fd; padding: 1.2rem 2rem; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 1.1rem; border: 1px solid #374151;">
      ★ View source on GitHub
    </a>
  </div>
  <p style="margin-top: 1rem; color: #94a3b8; font-size: 0.9rem;">macOS Apple Silicon · macOS Intel · Windows x64 · Linux x64 · Linux ARM64</p>
</div>

## No hosted backend: your credentials stay with you

S3 Studio reads the same profile configuration used by the **AWS CLI** and communicates directly with AWS. There's no account migration or hosted sync layer.

```
# your existing local setup
~/.aws/config
~/.aws/credentials
AWS_PROFILE
        │
        ▼
S3 Studio desktop app
        │
        ├── S3
        └── CloudFront
```

This means:

- **No hosted backend**: Operations run from the desktop app directly against AWS APIs.
- **Your IAM boundaries still apply**: The selected profile can only perform the actions its AWS permissions allow.
- **Open implementation**: Review the Rust, React, and TypeScript source or build the application yourself.

## Available platforms

S3 Studio ships native builds for:

- **macOS Apple Silicon** (M1/M2/M3/M4)
- **macOS Intel**
- **Windows x64**
- **Linux x64**
- **Linux ARM64**

All releases are available on the [S3 Studio GitHub page](https://github.com/Banegasn/s3-studio/releases/latest).

## Ideal use cases

- **DevOps teams** managing S3 buckets daily who need to invalidate CloudFront without opening the console
- **Developers** editing JSON/TXT configuration files directly in S3
- **Security teams** reviewing bucket permissions and policies
- **Static content management** hosted on S3 with CloudFront distribution
- **Migration and transfer** of files between buckets and local folders

## Frequently asked questions

### How does S3 Studio authenticate?

It discovers AWS CLI profiles from the standard config and credentials files, plus common AWS environment variables. It never asks you to upload credentials to any service.

### Does S3 really have folders?

No. Folder rows are S3 prefixes. S3 Studio represents them as folders for navigation while keeping prefix behavior explicit in the inspector and bulk operations.

### What platforms are available?

Tagged releases are built for macOS Apple Silicon and Intel, Windows x64, and Linux x64 and ARM64. Check the latest release for exact assets.

### How are CloudFront links found?

The app matches CloudFront origins to the selected S3 bucket, accounts for origin paths, and suggests viewer-path invalidations for the selected content.

### Is it free?

Yes, S3 Studio is **source-available** and free. You can download the binaries or build from source on GitHub.

## Links

- **[S3 Studio website](https://banegasn.github.io/s3-studio/)** — Explore all features
- **[Download latest release](https://github.com/Banegasn/s3-studio/releases/latest)** — Builds for macOS, Windows, and Linux
- **[Source code on GitHub](https://github.com/Banegasn/s3-studio)** — Star, contribute, and inspect
- **[Report issues](https://github.com/Banegasn/s3-studio/issues)** — Help improve the tool
