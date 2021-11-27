import axios, { AxiosResponse } from 'axios';
import { DeclarePlugin, PluginBase } from '../lib/PluginBase';

type RequestConfig<D = unknown> = import('axios').AxiosRequestConfig<D>;

class HttpRequest extends PluginBase {
  public async request<RequestData = unknown, ResponseData = unknown>(config: RequestConfig<RequestData>) {
    return axios.request<RequestData, AxiosResponse<ResponseData>>(config);
  }
  public async get<RequestData = unknown, ResponseData = unknown>(url: string, config?: RequestConfig<RequestData>) {
    return axios.get<RequestData, AxiosResponse<ResponseData>>(url, config);
  }
  public async delete<RequestData = unknown, ResponseData = unknown>(url: string, config?: RequestConfig<RequestData>) {
    return axios.delete<RequestData, AxiosResponse<ResponseData>>(url, config);
  }
  public async head<RequestData = unknown, ResponseData = unknown>(url: string, config?: RequestConfig<RequestData>) {
    return axios.head<RequestData, AxiosResponse<ResponseData>>(url, config);
  }
  public async options<RequestData = unknown, ResponseData = unknown>(url: string, config?: RequestConfig<RequestData>) {
    return axios.options<RequestData, AxiosResponse<ResponseData>>(url, config);
  }
  public async post<RequestData = unknown, ResponseData = unknown>(url: string, data?: RequestData, config?: RequestConfig<RequestData>) {
    return axios.post<RequestData, AxiosResponse<ResponseData>>(url, data, config);
  }
  public async put<RequestData = unknown, ResponseData = unknown>(url: string, data?: RequestData, config?: RequestConfig<RequestData>) {
    return axios.put<RequestData, AxiosResponse<ResponseData>>(url, data, config);
  }
  public async patch<RequestData = unknown, ResponseData = unknown>(url: string, data?: RequestData, config?: RequestConfig<RequestData>) {
    return axios.patch<RequestData, AxiosResponse<ResponseData>>(url, data, config);
  }
}

export default DeclarePlugin<HttpRequest>(new HttpRequest());
