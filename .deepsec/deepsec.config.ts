import { defineConfig } from "deepsec/config";

export default defineConfig({
  projects: [
    { id: "nozar", root: ".." },
    // <deepsec:projects-insert-above>
  ],
});
