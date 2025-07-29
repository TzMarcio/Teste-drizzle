import {drizzleCapacitor} from "./adapters/capacitor-sqlite-adapter";
import { user } from "./schemas/user.schema";
import {migrations} from "./adapters/migrations";

export const database = drizzleCapacitor('my-db3',
  migrations,
  {
  schema: {
    user,
  },
});
