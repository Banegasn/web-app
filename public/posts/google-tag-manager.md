--- 
id: "google-tag-manager"
title: "Setting Up Google Tag Manager Server-Side Manually"
summary: "A guide to manually configuring Google Tag Manager Server-Side using Docker on Railway. Learn how to set up the required tagging and preview servers for enhanced control and performance."
createdAt: "2025-04-24 12:00:00"
imageUrl: "images/tag-manager.png" 
---
# Setting Up Google Tag Manager Server-Side Manually with Docker on Railway

Google Tag Manager (GTM) Server-Side tagging offers significant benefits, including improved performance, better data control, and the ability to operate in a first-party context, mitigating some impacts of browser tracking restrictions. While Google Cloud Platform (GCP) offers an automated setup, you might prefer or need a manual configuration, especially if you want to host it on a different platform like Railway. This post outlines how to set up GTM Server-Side manually, specifically using Docker on Railway.

## Why Manual Setup?

Manual setup gives you more control over the hosting environment and potentially allows you to integrate it more closely with your existing infrastructure or preferred hosting provider.

## The Two-Service Requirement

A crucial aspect of a manual GTM Server-Side setup is that you need **two distinct services**:

1.  **Tagging Server:** This is the primary service that receives data from your website/app (via the GTM web container or direct hits), processes it according to your server container configuration, and forwards it to vendor endpoints (like Google Analytics, Facebook Pixel, etc.). This service handles the production traffic.
2.  **Preview Server:** This service is essential for debugging and testing your GTM Server-Side container. When you enable "Preview" mode in the GTM interface, requests are routed through this server, allowing you to see detailed information about incoming requests, event data, and outgoing requests in the GTM Preview interface.

These two services need to run independently but are configured using the same GTM Server Container configuration string.

## Hosting GTM Server-Side with Docker on Railway

Railway is a popular platform for deploying applications easily. Since GTM Server-Side can be run as a Docker container, Railway is a viable hosting option.

1.  **Get the Official GTM Image:** Google provides an official Docker image for the GTM Server-Side tagging server. You can find it on Google Cloud Artifact Registry (`gcr.io/cloud-tagging-101/gtm-cloud-image`).
2.  **Create a Custom Dockerfile:** While you *could* try to use the official image directly on Railway, you might encounter configuration challenges or want more control. A common approach is to create your own `Dockerfile` in a dedicated GitHub repository. This Dockerfile can be very simple:

    ```dockerfile
    # Use the official Google Tag Manager server-side image as the base
    FROM gcr.io/cloud-tagging-101/gtm-cloud-image:latest

    # (Optional) You might add other configurations or scripts here if needed

    # The base image already defines the necessary CMD and ENTRYPOINT
    ```

3.  **Deploy on Railway:**
    *   Create a new project on Railway.
    *   Choose "Deploy from GitHub repo" and select the repository containing your `Dockerfile`.
    *   Railway will automatically build and deploy your container.
4.  **Configuration via Environment Variables:** You'll need to configure your GTM Server-Side instance using environment variables in Railway:
    *   `CONTAINER_CONFIG`: **Crucially**, paste the GTM Server Container configuration string obtained from your GTM Server container setup interface. This links your deployed instance to your GTM account.
    *   `PORT`: Typically set to `8080` (or let Railway manage it via its internal port detection).
    *   `PREVIEW_SERVER_URL`: For your **Tagging Server** service, set this environment variable to the URL of your **Preview Server** service. This tells the tagging server where to send preview requests. The **Preview Server** service does *not* need this variable set.
    *   `RUN_AS_PREVIEW_SERVER`: Set this environment variable to `true` for your **Preview Server** service deployment. Omit it or set it to `false` for your main **Tagging Server** service.
5.  **Deploy Two Services:** Remember to deploy **two separate services** on Railway using the same GitHub repository and Dockerfile:
    *   One service configured as the Tagging Server (without `RUN_AS_PREVIEW_SERVER=true`, but with `PREVIEW_SERVER_URL` pointing to the other service).
    *   A second service configured as the Preview Server (with `RUN_AS_PREVIEW_SERVER=true`).
6.  **Domain Setup:** Configure custom domains for both your tagging server URL (e.g., `gtm.yourdomain.com`) and your preview server URL (e.g., `preview.gtm.yourdomain.com`) within Railway and your DNS provider.

## Cost Implications

Running GTM Server-Side on your own infrastructure, whether Railway, AWS, GCP, or others, means the traffic flows through your services. Unlike the client-side GTM, where the user's browser sends data directly to Google or other vendors, server-side tagging routes this data through *your* server first.

This means you will incur costs associated with:

*   **Compute Resources:** Running the Docker containers (CPU, Memory).
*   **Network Egress:** Sending data from your server to the vendor endpoints (Google Analytics, Facebook, etc.).
*   **Data Processing:** The volume of requests processed.

These costs scale with the amount of traffic your website or application receives. Factor this into your architecture budget.

## Achieving First-Party Context

One of the major advantages of GTM Server-Side is the ability to operate in a first-party context. By hosting the tagging server on your own domain (e.g., `gtm.yourdomain.com`), cookies set by the server-side container will be first-party cookies.

To enable this:

1.  **Set up your custom domain** for the Tagging Server service as described above.
2.  **Configure your GTM Web Container:** In your *web* GTM container (the one running in the user's browser), update your Google Tag (or GA4 Configuration Tag) settings. Find the `server_container_url` parameter (or similar field) and set it to the URL of your deployed Tagging Server (e.g., `https://gtm.yourdomain.com`).

Now, instead of sending data directly to `google-analytics.com`, the web container will send requests to your own server endpoint, which then processes and forwards the data.

By following these steps, you can successfully set up and run a manual GTM Server-Side configuration using Docker on Railway, gaining more control over your tagging infrastructure while understanding the associated responsibilities and costs.
