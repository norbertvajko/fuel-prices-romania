export default {
  customSyntax: 'postcss-lit',
  rules: {
    'at-rule-no-unknown': [
      true,
      {
        ignoreAtRules: [
          'apply',
          'layer',
          'tailwind',
          'responsive',
          'screen',
          'variants',
        ],
      },
    ],
  },
}
