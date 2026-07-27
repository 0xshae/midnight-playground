# Midnight Local Playground

Este proyecto extiende la Midnight Network con herramientas adicionales para desarrolladores.

Un **playground** para escribir contratos [Compact](https://docs.midnight.network) y desplegarlos **localmente** en tu máquina. Usa la **Midnight Lace Preview Wallet** en la red **“Undeployed”** para fondear tu billetera, desplegar contratos e interactuar con ellos, sin depender de testnets públicas o faucets.

---

## Para qué sirve este repositorio

- **Escribir** contratos inteligentes en Compact (edita el ejemplo en `midnight-local-dapp` o añade el tuyo).
- **Ejecutar** una red local de Midnight completa (nodo, indexador, servidor de pruebas) vía Docker.
- **Fondear** tu billetera derivada de Lace mediante un script de CLI (no hay faucet integrado en Undeployed).
- **Desplegar** contratos desde la raíz del repositorio usando la **misma billetera que Lace** (basada en mnemónico).
- **Interactuar** con los contratos desplegados a través de la interfaz de usuario de la billetera Lace o una CLI adaptada para la configuración local.

Ideal para desarrollo, talleres y aprendizaje del toolchain de Compact y el stack de Midnight de forma local.

---

## Requisitos previos

- **Git**
- **Docker** y **Docker Compose v2**
- **Node.js ≥ 22.16.0** (se recomienda [nvm](https://github.com/nvm-sh/nvm))
- **Yarn** (classic)
- Extensión de navegador **Midnight Lace Preview** (v2.36.0 o posterior)

---

## Referencia rápida: puertos

| Servicio       | Puerto | Propósito              |
|----------------|-------|------------------------|
| Proof Server   | 6300  | Generación de pruebas ZK|
| Node            | 9944  | RPC / cadena           |
| Indexer         | 8088  | API GraphQL             |

---

## Configuración paso a paso

Todos los comandos a continuación se ejecutan desde la **raíz del repositorio** a menos que se indique lo contrario.

### 1. Clonar e instalar

```bash
git clone https://github.com/0xshae/midnight-playground.git midnight-playground
cd midnight-playground
nvm use 22   # o: nvm install 22 && nvm use 22
yarn install
```

### 2. Iniciar la red local

```bash
docker compose up -d
```

Espera un momento para que inicie (aprox. 30 segundos). El nodo, el indexador y el servidor de pruebas estarán disponibles en los puertos mencionados anteriormente.

### 3. Conectar Lace a “Undeployed”

- En **Lace** $\rightarrow$ **Settings** $\rightarrow$ **Midnight**
- Establece la red en **“Undeployed”**
- Guarda y cambia la billetera a esa red

Usa la misma billetera (y mnemónico) para el fondeo y el despliegue para que las direcciones coincidan.

### 4. Fondear tu billetera

La red Undeployed no tiene faucet. Usa el script de fondeo incluido con tu **mnemónico BIP-39** (el de Lace):

```bash
yarn fund "tus doce o veinticuatro palabras mnemónicas"
```

Esto fondea tanto las direcciones protegidas (shielded) como las no protegidas (unshielded) derivadas de ese mnemónico (misma derivación que Lace). También puedes fondear una sola dirección:

```bash
yarn fund mn_shield-addr_undeployed1...
yarn fund mn_addr_undeployed1...
```

### 5. Generar DUST en Lace (requerido antes del despliegue)

Desplegar un contrato consume **DUST** para las comisiones. Debes tener DUST en tu billetera Lace en la red Undeployed:

1. Abre **Lace** $\rightarrow$ **Midnight** (Undeployed).
2. Usa la interfaz de la billetera para **generar DUST** (sigue los pasos dentro de la app de Lace).
3. **Espera a que el DUST se recargue** hasta el nivel requerido.

Si omites este paso, `yarn deploy` puede fallar debido a DUST insuficiente.

### 6. Desplegar el contrato Hello World

Desde la raíz del repo, usando el **mismo mnemónico** que en Lace:

```bash
yarn deploy "tus doce o veinticuatro palabras mnemónicas"
```

- Requiere una billetera **fondeada** (`yarn fund` primero) y **DUST** (generado en Lace).
- Despliega el contrato de `midnight-local-dapp` (ejemplo Hello World).
- Escribe el archivo **`midnight-local-dapp/deployment.json`** con el `contractAddress` y el `txHash`.

Puedes ejecutar esto nuevamente después de cambiar el contrato (ver más abajo).

---

## Cambiar el contrato y volver a desplegar

1. **Edita** el código fuente de Compact, por ejemplo:  
   `midnight-local-dapp/contracts/hello-world.compact`
2. **Recompila** desde el directorio de la dApp:
   ```bash
   cd midnight-local-dapp
   yarn compile
   cd ..
   ```
3. **Vuelve a desplegar** desde la raíz del repo:
   ```bash
   yarn deploy "tu mnemónico"
   ```

El script de despliegue está actualmente vinculado al contrato **Hello World** y su punto de entrada/verificador `storeMessage`. Para desplegar un contrato o punto de entrada diferente, tendrías que apuntar el script de despliegue a la ruta del contrato y a la clave del verificador (ver `src/deploy.ts`).

---

## Interactuar con el contrato desplegado

### Opción A: CLI (leer estado del contrato)

La carpeta `midnight-local-dapp` incluye una CLI que utiliza la **misma derivación de billetera que Lace/deploy**, por lo que tu dirección y saldo coincidirán.

```bash
cd midnight-local-dapp
yarn install
yarn build
yarn cli
```

Ingresa tu mnemónico cuando se te solicite. La CLI puede:
- **Leer** el mensaje actual almacenado en el contrato.
- **Mostrar** la dirección y el saldo de tu billetera (coincide con Lace).

Ejemplo de sesión:
```
Hello World Contract CLI (Lace-compatible wallet)

Contract: aa6ce704ee3f482b8675ba1b0f95f9e0dfa8fbcf693800e32f3b5593dbd41688

Enter your mnemonic: <tu mnemónico>

Building wallet (same derivation as Lace)...
Your wallet address (Lace match): mn_shield-addr_undeployed1r6d...
Balance: 94011000000

--- Menu ---
1. Read current message
2. Show wallet info
3. Exit
```

### Opción B: Interfaz de Lace (almacenar mensajes)

Para **almacenar un mensaje** en el contrato, usa un frontend de dApp conectado a Lace:

1. Construye o usa una dApp que se conecte a Lace a través de la **dapp-connector-api**.
2. Configúrala para la red **Undeployed** con los endpoints locales:
   - Indexador: `http://127.0.0.1:8088/api/v3/graphql`
   - Nodo: `http://127.0.0.1:9944`
   - Servidor de pruebas: `http://127.0.0.1:6300`
3. Apúntala a la dirección del contrato que se encuentra en `midnight-local-dapp/deployment.json`.
4. Llama al circuito `storeMessage` a través de la interfaz de la dApp.

Lace utilizará tu nodo/indexador local cuando esté conectado a Undeployed.

### ¿Por qué la CLI no puede almacenar mensajes?

Almacenar un mensaje requiere llamar al circuito `storeMessage`, lo cual implica:
- Construir una transacción de llamada al contrato con pruebas ZK.
- Que el servidor de pruebas genere las pruebas para las entradas del circuito.

Esto normalmente lo gestiona un frontend de dApp + Lace, que maneja la generación de pruebas y la firma de la transacción a través del conector de la billetera. La CLI actualmente se enfoca en leer el estado, lo cual no requiere pruebas.

---

## Estructura del repo (partes relevantes)

```
midnight-playground/
├── compose.yml          # Docker: node, indexer, proof-server
├── package.json         # Scripts raíz: fund, deploy
├── src/
│   ├── fund.ts          # Fondear shielded/unshielded desde mnemónico o dirección
│   ├── deploy.ts        # Desplegar Hello World usando billetera compatible con Lace
│   └── utils.ts         # Inicialización de billetera (HD wallet, misma derivación que Lace)
└── midnight-local-dapp/
    ├── contracts/
    │   ├── hello-world.compact   # Edita esto (o añade nuevos contratos)
    │   └── managed/hello-world/  # Salida compilada, claves, módulo del contrato
    ├── deployment.json           # Escrito por yarn deploy
    ├── src/
    │   ├── cli.ts                # CLI para leer el estado del contrato
    │   └── utils.ts              # Utils de billetera (igual que en la raíz)
    └── package.json              # scripts de compile, build, cli
```

---

## Scripts

### Raíz del repositorio

| Script                   | Descripción |
|--------------------------|-------------|
| `yarn fund "mnemonic"`   | Fondo direcciones derivadas de Lace en Undeployed (o pasa una sola dirección). |
| `yarn deploy "mnemonic"` | Despliega el contrato Hello World; requiere billetera fondeada + DUST en Lace. |

### midnight-local-dapp

| Script        | Descripción                                |
|---------------|--------------------------------------------|
| `yarn compile`| Compila `contracts/hello-world.compact`    |
| `yarn build`  | Compila TypeScript (`src/` $\rightarrow$ `dist/`)      |
| `yarn cli`    | Ejecuta la CLI interactiva (leer estado del contrato, mostrar info de billetera) |

---

## Solución de problemas

- **“El saldo sigue siendo 0”**  
  Ejecuta `yarn fund "tu mnemónico"` y asegúrate de que la red local esté activa (`docker compose up -d`).

- **El despliegue falla (ej. DUST insuficiente)**  
  En Lace (Undeployed), genera DUST y espera a que se recargue, luego ejecuta `yarn deploy` nuevamente.

- **“Invalid Transaction: Custom error: 110”**  
  El nodo rechazó el despliegue (ej. problema con la clave del verificador o la prueba). Revisa `docker compose logs node` y asegúrate de que las versiones del nodo/imagen en `compose.yml` coincidan con las versiones de ledger-v6 y proof-server utilizadas en este repositorio.

- **“Command 'fund' not found”**  
  Ejecuta `yarn install` desde la raíz del repositorio para que el script `fund` esté disponible.

---

## Referencias

- [Midnight Docs – Interact with an MN app](https://docs.midnight.network/getting-started/interact-with-mn-app) (Flujo de CLI para Testnet; adapta los endpoints y la red para Undeployed local).
- [Compact](https://docs.midnight.network) – Lenguaje de contratos inteligentes y toolchain de Midnight.
