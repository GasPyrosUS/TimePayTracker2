module.exports = ({ config }) => {
  const repository = process.env.GITHUB_REPOSITORY || "";
  const repositoryName = repository.includes("/")
    ? repository.split("/").pop()
    : repository;

  const isGitHubPagesBuild = process.env.EXPO_GITHUB_PAGES === "1";
  const isUserSite = repositoryName.endsWith(".github.io");

  const baseUrl =
    isGitHubPagesBuild && repositoryName && !isUserSite
      ? `/${repositoryName}`
      : undefined;

  return {
    ...config,
    web: {
      ...(config.web || {}),
      bundler: "metro",
      output: "static",
    },
    experiments: {
      ...(config.experiments || {}),
      ...(baseUrl ? { baseUrl } : {}),
    },
  };
};
