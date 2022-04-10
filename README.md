# Relive Edge

```bash
yarn global add @anitya-tech/relive-edge
npm i -g @anitya-tech/relive-edge
```

## Record Mode

```bash
INSTANCE_ID=develop
RELIVE_EDGE_WORKDIR=/path/to/stream-store
BL_REC_PATH=/path/to/BililiveRecorder.Cli

relive-edge rec
```

## Encorder Mode

```bash
relive-edge encode -f <filters>
```

## Fix Mode

```bash
relive-edge fix <file> [...<files>]
```
