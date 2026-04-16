# Survey-MicroFrontend

Angular 21 starter prepared for a survey micro-frontend with:

- Tailwind CSS v4
- generated Angular OpenAPI client
- local Swagger spec in `openapi/swagger.json`

## Requirements

- Node.js `22.22.1` or any supported Angular 21 runtime such as Node `20.19+`
- npm `10+`

An `.nvmrc` file is included for convenience.

## Run

```bash
npm install
npm start
```

The dev server runs at `http://localhost:4200/`.

## Build

```bash
npm run build
```

## Regenerate the API client

```bash
npm run generate:api
```

Generated files are written to `src/app/core/api/generated`.

## API base URL

Update the backend URL in:

- `src/environments/environment.ts`
- `src/environments/environment.development.ts`

## Notes

- The generated client is registered in `src/app/app.config.ts` using `provideApi(...)`.
- Tailwind is enabled through `src/styles.css` and `.postcssrc.json`.
