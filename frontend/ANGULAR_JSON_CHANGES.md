# Optional angular.json tweak (only needed for `ng build --configuration production`)

If you ever run a production build, open `angular.json`, find
`projects.<your-app-name>.architect.build.configurations.production`,
and update two things so the build doesn't complain about the new fonts/styles:

1. Add (or edit) an `optimization` block:
```json
"optimization": {
  "scripts": true,
  "styles": { "minify": true, "inlineCritical": true },
  "fonts": false
},
```

2. Find the `budgets` array in that same `production` config and raise the
`anyComponentStyle` entry:
```json
{
  "type": "anyComponentStyle",
  "maximumWarning": "4kb",
  "maximumError": "8kb"
}
```

`ng serve` (regular dev mode) doesn't need any of this — only production builds do.
