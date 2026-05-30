/**
 * Side-effect imports that register every persisted store with the
 * registry on module load.
 *
 * The factory `createPersistedStore` calls `registerStore` only when its
 * containing module is evaluated. Routes that don't import a given store
 * (e.g. `/settings` doesn't pull in `search-history-store` or
 * `tag-orders-store`) would otherwise leave it absent from the registry,
 * and global ops (`resetAllStores` / `exportAllStores` / `importAllStores`)
 * would silently skip it — leaving stale localStorage entries after a
 * reset and producing incomplete backups.
 *
 * Import this module exactly once, from the root layout, so every route
 * boots with the full registry.
 */

import './settings-store'
import './favorites-store'
import './history-store'
import './search-history-store'
import './watch-later-store'
import './tag-orders-store'
