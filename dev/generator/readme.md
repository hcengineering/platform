# Overview

Random data generator

## Usage

```bash
cd ./dev/generator
rushx run-local gen recruit workspace 20
rushx run-local gen issue workspace 20
rushx run-prepare gen issue sanity-ws "" 1
rushx run-prepare gen issue sanity-ws "" 1 --minusDay '1'
rushx run-prepare gen issue sanity-ws "" 1 -m '5' -t 'test1'
```

Will generate 20 candidate cards.
