const beeline = require('honeycomb-beeline')
beeline({
  writeKey: 'API_KEY',
  dataset: 'koa-beeline',
})

const compose = require('koa-compose');
const Koa = require('koa');
const app = module.exports = new Koa();

function finishTrace(span) {
  console.log("finishing trace")
  beeline.finishSpan(span)
}

async function firstMiddleware(ctx, next) {
  console.log("starting trace")
  let span = beeline.startTrace();
  await next();
  // finishTrace(span) // breaks
  ctx.req.on('close', beeline.bindFunctionToTrace(async () => {
    finishTrace(span) // works
  }))
}

async function secondMiddleware(ctx, next) {
  console.log('--- traceContext (A) ---')
  console.log(beeline.getTraceContext())
  console.log('--- ./ traceContext (A) ---')

  console.log("binding function")

  ctx.req.on('close', beeline.bindFunctionToTrace(async () => {
    console.log("executing function")

    console.log('--- traceContext (B) ---')
    console.log(beeline.getTraceContext())
    console.log('--- ./ traceContext (B) ---')

    const span = beeline.startSpan({ name: 'Closing request' })

    if (span) beeline.finishSpan(span)

  }))

  await next()

  ctx.body = 'Hello World';
}

// composed middleware

const all = compose([
  firstMiddleware,
  secondMiddleware
]);

app.use(all);

if (!module.parent) app.listen(3000);
