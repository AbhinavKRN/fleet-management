export const urls = {
  users: '',
  vehicles: '',
  telemetry: '',
  maps: '',
  notifications: '',
};

export function setUrls(next) {
  Object.assign(urls, next);
}
