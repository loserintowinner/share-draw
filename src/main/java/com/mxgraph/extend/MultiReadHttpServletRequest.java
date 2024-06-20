package com.mxgraph.extend;

import javax.servlet.ReadListener;
import javax.servlet.ServletInputStream;
import javax.servlet.ServletRequest;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletRequestWrapper;
import java.io.*;
import java.nio.charset.Charset;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.Map;

public class MultiReadHttpServletRequest extends HttpServletRequestWrapper {

    private byte[] body;
    private String headers;

    public MultiReadHttpServletRequest(HttpServletRequest request) throws IOException {
        super(request);
        body = getBodyString(request);
        headers = getHeadersString(request);
    }

    @Override
    public BufferedReader getReader() throws IOException {
        return new BufferedReader(new InputStreamReader(getInputStream()));
    }

    @Override
    public ServletInputStream getInputStream() throws IOException {

        final ByteArrayInputStream bais = new ByteArrayInputStream(body);

        return new ServletInputStream() {

            @Override
            public int read() throws IOException {
                return bais.read();
            }

            @Override
            public boolean isFinished() {
                return false;
            }

            @Override
            public boolean isReady() {
                return false;
            }

            @Override
            public void setReadListener(ReadListener readListener) {

            }
        };
    }


    private String getHeadersString(HttpServletRequest request) {
        StringBuilder sb = new StringBuilder();
        Enumeration<String> headerNames = request.getHeaderNames();
        while (headerNames.hasMoreElements()) {
            String headerName = headerNames.nextElement();
            Enumeration<String> headers = request.getHeaders(headerName);
            while (headers.hasMoreElements()) {
                String headerValue = headers.nextElement();
                sb.append(headerName + ": " + headerValue + "\n");
            }
        }
        return sb.toString();
    }

    /**
     * 获取请求Body
     *
     * @param request
     * @return
     */
    private byte[] getBodyString(ServletRequest request) {
        InputStream inputStream = null;
        byte[] buffer = null;
        try {
            inputStream = request.getInputStream();
            buffer = inputStream.readAllBytes();
        } catch (IOException e) {
            e.printStackTrace();
        } finally {
            if (inputStream != null) {
                try {
                    inputStream.close();
                } catch (IOException e) {
                    e.printStackTrace();
                }
            }
        }
        return buffer;
    }

    public byte[] getBody() {
        return body;
    }

    public String getHeaders() {
        return headers;
    }
}
