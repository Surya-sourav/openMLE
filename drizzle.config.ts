import {defineConfig} from "drizzle-kit"
import 'dotenv/config';

export default defineConfig({
    out : './src/electron/internal-database/migrations',
    schema : './src/electron/internal-database/schemas/*.schema.ts',
    dialect : 'sqlite',
    dbCredentials : {
        url : process.env.DB_FILE_NAME!,
    }
})