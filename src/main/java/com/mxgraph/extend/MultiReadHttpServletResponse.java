package com.mxgraph.extend;

import javax.servlet.ServletOutputStream;
import javax.servlet.WriteListener;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpServletResponseWrapper;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.util.Collection;
import java.util.Enumeration;

public class MultiReadHttpServletResponse extends HttpServletResponseWrapper {

    private ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream();
    private HttpServletResponse response;

    public MultiReadHttpServletResponse(HttpServletResponse response) {
        super(response);
        this.response = response;
    }

    public byte[] getBody() {
        return byteArrayOutputStream.toByteArray();
    }

    public String getHeaders() {
        StringBuilder sb = new StringBuilder();
        Collection<String> headerNames = response.getHeaderNames();
        for (String headerName : headerNames) {
            Collection<String> headerValues = response.getHeaders(headerName);
            for (String headerValue : headerValues) {
                sb.append(headerName + ": " + headerValue + "\n");
            }
        }
        return sb.toString();
    }

    @Override
    public ServletOutputStream getOutputStream() {
        return new ServletOutputStreamWrapper(this.byteArrayOutputStream, this.response);
    }

    @Override
    public PrintWriter getWriter() throws IOException {
        return new PrintWriter(new OutputStreamWriter(getOutputStream(), this.response.getCharacterEncoding()));
    }


    private static class ServletOutputStreamWrapper extends ServletOutputStream {

        private ByteArrayOutputStream outputStream;
        private HttpServletResponse response;

        public ServletOutputStreamWrapper(ByteArrayOutputStream outputStream, HttpServletResponse response) {
            this.outputStream = outputStream;
            this.response = response;
        }

        @Override
        public boolean isReady() {
            return true;
        }

        @Override
        public void setWriteListener(WriteListener listener) {

        }

        @Override
        public void write(int b) throws IOException {
            response.getOutputStream().write(b);
            outputStream.write(b);
        }

        @Override
        public void flush() throws IOException {
            response.getOutputStream().flush();
        }

        @Override
        public void close() throws IOException {
            response.getOutputStream().close();
        }
    }
}
