import { loadEnv } from "./env.js";
import { createPool } from "./db.js";
import { createApp } from "./app.js";

loadEnv();

const pool = createPool();
const port = Number(process.env.PORT || 3000);
const app = createApp(pool);

app.listen(port, () => {
  console.log(`stayledger listening on ${port}`);
});
