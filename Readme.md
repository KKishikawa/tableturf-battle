# The deck build tool for Tableturf Battle

This tool is deck build for tableturf battle ([website](https://tableturf-battle.khr32.com/)).

## Development

### Requirement

- node
  see `.nvmrc` for node version

#### Install dependencies

```sh
npm install
```

#### Local hosting (HMR)

```sh
npm run dev
```

#### Build

```sh
npm run build
```

## Testing

### Unit Test (Vitest)

#### Run Vitest

```sh
npm run test:unit
```

#### Debug Vitest

```sh
npm run test:unit:debug
```

### E2E Test (Playwright)

#### Run Playwright

```sh
npm run test:e2e
```

#### Debug Playwright

```sh
npm run test:e2e:debug
```
