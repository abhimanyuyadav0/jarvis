import type { ConfigEnv, UserConfig } from 'vite'
import { defineConfig, mergeConfig } from 'vite'
import { getBuildConfig, external, pluginHotRestart } from './vite.base.config'

export default defineConfig((env) => {
  const forgeEnv = env as ConfigEnv<'build'>
  const { forgeConfigSelf } = forgeEnv
  const config: UserConfig = {
    build: {
      rollupOptions: {
        external,
        input: forgeConfigSelf.entry!,
        output: {
          format: 'cjs',
          inlineDynamicImports: true,
          // .cjs — see vite.main.config.ts for why (root package.json is "type": "module").
          entryFileNames: '[name].cjs',
          chunkFileNames: '[name].cjs',
          assetFileNames: '[name].[ext]',
        },
      },
    },
    plugins: [pluginHotRestart('reload')],
  }

  return mergeConfig(getBuildConfig(forgeEnv), config)
})
