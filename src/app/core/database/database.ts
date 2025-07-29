import {drizzleCapacitor} from "./adapters/capacitor-sqlite-adapter";
import { user } from "./schemas/user.schema";

export const database = drizzleCapacitor('my-db', {
  schema: {
    user,
  },
});
