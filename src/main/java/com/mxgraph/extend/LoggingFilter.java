package com.mxgraph.extend;

import com.mxgraph.online.Constants;

import javax.servlet.*;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.nio.charset.StandardCharsets;

public class LoggingFilter implements Filter {
    // 打印请求响应的配置开关
    private boolean isEnabled;
    private String[] excludeSuffix;

    @Override
    public void init(FilterConfig filterConfig) throws ServletException {
        String enableFilterParam = filterConfig.getInitParameter("enableFilter");
        isEnabled = Boolean.parseBoolean(enableFilterParam);
        String excludeSuffixParam = filterConfig.getInitParameter("excludeSuffix");
        excludeSuffix = excludeSuffixParam.split(",");
    }

    private void logRequestBody(MultiReadHttpServletRequest request) {
        MultiReadHttpServletRequest wrapper = request;
        if (wrapper != null) {
            try {
                String url = wrapper.getRequestURI().replace("//", "/");
                System.out.println("-------------------------------- 请求url: " + url + " --------------------------------");
                System.out.println(request.getQueryString());
                System.out.println(wrapper.getHeaders());
                byte[] body = wrapper.getBody();
                if (body.length <= 1024) {
                    String bodyString = new String(body, StandardCharsets.UTF_8);
                    System.out.println(bodyString);
                } else {
                    System.out.println("body length=" + body.length);
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }

    private void logResponseBody(MultiReadHttpServletRequest request, MultiReadHttpServletResponse response, long useTime) {
        MultiReadHttpServletResponse wrapper = response;
        if (wrapper != null) {
            System.out.println("-------------------------------- 响应url: " + request.getRequestURI() + "--------------------------------");
            System.out.println(wrapper.getHeaders());
            byte[] buf = wrapper.getBody();
            if (buf.length > 0) {
                String payload;
                try {
                    payload = new String(buf, 0, buf.length, wrapper.getCharacterEncoding());
                } catch (UnsupportedEncodingException ex) {
                    payload = "[unknown]";
                }
                System.out.println(payload);
            }
        }
    }

    @Override
    public void doFilter(ServletRequest req, ServletResponse resp, FilterChain filterChain) throws IOException, ServletException {
        MultiReadHttpServletRequest wrappedRequest = new MultiReadHttpServletRequest((HttpServletRequest) req);
        MultiReadHttpServletResponse wrappedResponse = new MultiReadHttpServletResponse((HttpServletResponse) resp);

        if (isFilter((HttpServletRequest) req)) {
            long startTime = System.currentTimeMillis();
            long endTime = 0;
            try {

                // 记录请求的消息体
                logRequestBody(wrappedRequest);
                endTime = System.currentTimeMillis();
                filterChain.doFilter(wrappedRequest, wrappedResponse);
            } catch (Exception e) {
                e.printStackTrace();
            } finally {
                // 记录响应的消息体
                logResponseBody(wrappedRequest, wrappedResponse, endTime - startTime);
            }
        } else {
            filterChain.doFilter(wrappedRequest, wrappedResponse);
        }
    }

    public boolean isFilter(HttpServletRequest servletRequest) {
        if (!isEnabled) {
            return false;
        }
        String requestURI = servletRequest.getRequestURI();
        for (String suffix : excludeSuffix) {
            if (requestURI.endsWith(suffix)) {
                return false;
            }
        }
        return true;
    }

    @Override
    public void destroy() {

    }
}
