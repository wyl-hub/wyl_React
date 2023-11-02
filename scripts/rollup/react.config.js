import { resolvePkgPath, getPackageJSON, getBaseRollupPlugins } from "./utils"
import generatePackageJson from "rollup-plugin-generate-package-json"

const { name, module } = getPackageJSON("react")
// 包路径  packages  (packages/react)
const pkgPath = resolvePkgPath(name)
// 打包路径  dist node_modules (dist/node_modules/react)
const pkgDistPath = resolvePkgPath(name, true)

export default [
  {
    input: `${pkgPath}/${module}`, // 入口文件
    output: {
      file: `${pkgDistPath}/index.js`,
      name: "React",
      format: "umd",
    },
    plugins: [
      ...getBaseRollupPlugins(),
      generatePackageJson({
        inputFolder: pkgPath,
        outputFolder: pkgDistPath,
        baseContents: ({ name, description, version }) => ({
          name,
          description,
          version,
          main: "index.js",
        }),
      }),
    ],
  },
  {
    input: `${pkgPath}/src/jsx.ts`, // 入口文件
    output: [
      {
        file: `${pkgDistPath}/jsx-runtime.js`,
        name: "jsx-runtime",
        format: "umd",
      },
      {
        file: `${pkgDistPath}/jsx-dev-runtime.js`,
        name: "jsx-dev-runtime",
        format: "umd",
      },
    ],
    plugins: getBaseRollupPlugins(),
  },
]
