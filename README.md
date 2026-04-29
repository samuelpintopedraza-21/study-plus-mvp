# Study+ v6.5 · fecha visual corregida + clases

Esta versión corrige el desfase visual donde un bloque calculado para domingo podía aparecer agrupado bajo sábado.

## Qué corrige

- La fecha actual sigue siendo dinámica y se calcula con zona horaria de Bogotá.
- Las agrupaciones de bloques ya no usan `new Date('YYYY-MM-DD')` directo, porque eso se interpreta en UTC y puede moverse al día anterior en Bogotá.
- El encabezado del día y la fecha interna del bloque quedan sincronizados.
- Mantiene horario de clases, movilidad, clima y recomendaciones campus/casa.

## Instalación

Crea `.env` en la raíz:

```env
DATABASE_URL="file:./dev.db"
NEXT_PUBLIC_APP_NAME="Study+"
```

Luego ejecuta:

```bash
npm.cmd install
npx.cmd prisma generate
npx.cmd prisma db push --force-reset
npm.cmd run dev
```

Abre:

```text
http://localhost:3000
```
