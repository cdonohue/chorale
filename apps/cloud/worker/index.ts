import { Effect, Layer, Schema, } from "effect";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { HttpApi, HttpApiBuilder, HttpApiEndpoint, HttpApiError, HttpApiGroup, HttpApiScalar } from "effect/unstable/httpapi";

const Api = HttpApi.make("api")
  .add(
    HttpApiGroup.make("group")
      .add(
        HttpApiEndpoint.get("name", "/api", {
          "success": Schema.Struct({
            name: Schema.String,
          })
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
    .handle("catchAll", () => Effect.fail(new HttpApiError.NotFound()))
)

const ApiLive = HttpApiBuilder.layer(Api).pipe(
  Layer.provide(GroupLive),
  Layer.provide(HttpServer.layerServices),
)

const DocsLive = HttpApiScalar.layer(Api);

const { handler } = HttpRouter.toWebHandler(Layer.mergeAll(ApiLive, DocsLive));

export default {
  fetch(request) {
    return handler(request);
  }
} satisfies ExportedHandler;