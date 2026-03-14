import { env } from "cloudflare:workers";
import { Effect, Layer, Schema, } from "effect";
import { HttpRouter, HttpServer, HttpServerRequest, HttpServerResponse } from "effect/unstable/http";
import { HttpApi, HttpApiBuilder, HttpApiEndpoint, HttpApiError, HttpApiGroup, HttpApiScalar } from "effect/unstable/httpapi";

import { getSandbox, Sandbox } from "@cloudflare/sandbox";

export { Sandbox }

const Api = HttpApi.make("api")
  .add(
    HttpApiGroup.make("group")
      .add(
        HttpApiEndpoint.get("name", "/api", {
          "success": Schema.Struct({
            name: Schema.String,
          })
        }),
        HttpApiEndpoint.get("terminal", "/ws/terminal", {
          "success": Schema.Any
        }),
        HttpApiEndpoint.get("catchAll", "*", {
          error: HttpApiError.NotFound
        })
      )
  )

const GroupLive = HttpApiBuilder.group(
  Api,
  "group",
  (handlers) => handlers
    .handle("name", () => Effect.succeed({ name: "Cloudflare" }))
    .handle("terminal", (ctx) => Effect.gen(function* () {
      const request = yield* HttpServerRequest.toWeb(ctx.request)
      const sandbox = getSandbox(env.Sandbox, "default");
      const session = yield* Effect.promise(() => sandbox.createSession());
      const terminal = yield* Effect.promise(() => session.terminal(request, { cols: 80, rows: 24 }) as Promise<Response>)

      return HttpServerResponse.fromWeb(terminal);
    }))
    .handle("catchAll", () => Effect.fail(new HttpApiError.NotFound()))
)

const ApiLive = HttpApiBuilder.layer(Api).pipe(
  Layer.provide(GroupLive),
  Layer.provide(HttpServer.layerServices),
)

const DocsLive = HttpApiScalar.layer(Api);

const { handler } = HttpRouter.toWebHandler(Layer.mergeAll(ApiLive, DocsLive));

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // TODO: Surely there's an Effect way of doing this?
    if (url.pathname.startsWith("/ws/terminal")) {
      const sandbox = getSandbox<Sandbox>(env.Sandbox, "default");
      const session = await sandbox.createSession();

      return session.terminal(request, { cols: 80, rows: 24 });
    }

    return handler(request);
  }
} satisfies ExportedHandler;