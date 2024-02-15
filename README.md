bun-openai
===========

This repository contains a collection of various applications powered by the [OpenAI API](https://platform.openai.com/docs/overview), with backend support from a [Bun](https://bun.sh/docs) server. Built with libraries like [React.js](https://react.dev) and [Vue.js](https://vuejs.org), these serverless applications allow for backend replacement with your preferred server application.

---

このリポジトリには、[OpenAI API](https://platform.openai.com/docs/overview)を活用したさまざまなアプリケーションのコレクションが含まれています。バックエンドのサポートは[Bun](https://bun.sh/docs)サーバーが提供し、[React.js](https://react.dev)や[Vue.js](https://vuejs.org)などのライブラリを使用して構築されています。これらのサーバーレスアプリケーションは、バックエンドをお好みのサーバーアプリケーションに置き換えることが可能です。

# Motivation

The main purpose of this repository is to serve as a coding exercise to learn more about Bun, as an alternative to Node.js.

The second purpose is to use this as sandbox in exploring different project ideas primarily those using OpenAI APIs.


# Server

The [Bun server](/server/README.md) is a just simple HTTP server. It is the main workhorse that serves all the sample applications. The server needs to be running to provide backend services for the applications.


# Applications

All applications are powered by **OpenAI API**s unless stated otherwise. You can refer to the README for each project for more detailed descriptions.

* [react-chatbot](/react-chatbot/README.md), a sample chatbot application, with ***streaming***.


# Setup

First, make sure to install Bun

```bash
npm install -g bun
```

See [Bun installation page](https://bun.sh/docs/installation) for more details.

To clone the repository and install the dependencies

```bash
bun create github.com/supershaneski/bun-openai myproject

cd myproject

bun install
```

This should install all dependencies for each package within the workspace.

To run the server

```bash
cd server

bun start
```

To run an application, from root directory

```bash
cd app_dir # application directory

bun start
```
