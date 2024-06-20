package com.mxgraph.extend.yun139;

import com.mxgraph.extend.MultiReadHttpServletRequest;

import javax.servlet.ServletException;
import javax.servlet.ServletOutputStream;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.*;
import java.net.HttpURLConnection;
import java.net.ProtocolException;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Scanner;

public class Yun139APIServlet extends HttpServlet {

    @Override
    public void init() throws ServletException {
        super.init();
        System.out.println("start server");
        System.setProperty("sun.net.http.allowRestrictedHeaders", "true");
    }

    @Override
    public void doPost(HttpServletRequest request, HttpServletResponse response) {
        HttpURLConnection httpConn = null;
        try {
            URL url = null;

            String action = request.getParameter("action");
            if (action.equals("queryGroup")) {
                url = new URL("https://yun.139.com/orchestration/group-rebuild/groupManage/v1.0/queryGroup");
            } else if (action.equals("queryGroupContentList")) {
                url = new URL("https://yun.139.com/orchestration/group-rebuild/content/v1.0/queryGroupContentList");
            } else if (action.equals("getGroupFileDownLoadURL")) {
                url = new URL("https://yun.139.com/orchestration/group-rebuild/groupManage/v1.0/getGroupFileDownLoadURL");
            } else if (action.equals("getGroupFileUploadURL")) {
                url = new URL("https://yun.139.com/orchestration/group-rebuild/content/v1.0/getGroupFileUploadURL");
            } else if (action.equals("uploadFile")) {
                url = new URL(request.getParameter("path"));
            } else if (action.equals("deleteFile")) {
                url = new URL("https://yun.139.com/orchestration/group-rebuild/task/v1.0/createBatchOprTask");
            }

            httpConn = (HttpURLConnection) url.openConnection();
            httpConn.setRequestMethod("POST");

            if (action.equals("uploadFile")) {
                this.setRequestHeaderUpload(request, httpConn);
            } else {
                this.setRequestHeader(request, httpConn);
            }


            httpConn.setDoOutput(true);
            OutputStream writer = httpConn.getOutputStream();
            writer.write(((MultiReadHttpServletRequest) request).getBody());
            writer.flush();
            writer.close();
            httpConn.getOutputStream().close();


            BufferedReader in = new BufferedReader(new InputStreamReader(httpConn.getInputStream(), "UTF-8"));
            String inputLine;
            StringBuffer sb = new StringBuffer();
            while ((inputLine = in.readLine()) != null) {
                sb.append(inputLine);
            }
            in.close();
            String res = sb.toString();

            response.setStatus(httpConn.getResponseCode());
            response.setContentType("text/html;charset=utf-8");
            PrintWriter out = response.getWriter();
            out.write(res);
            out.flush();
            out.close();
        } catch (IOException e) {
            e.printStackTrace();
        } finally {
            if (httpConn != null) {
                httpConn.disconnect();
            }
        }

    }

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response) {
        response.setContentType("application/octet-stream");
        String path = request.getParameter("path");
        HttpURLConnection httpConn = null;
        try {
            URL url = new URL(path);

            httpConn = (HttpURLConnection) url.openConnection();
            this.setRequestHeader(request, httpConn);


            InputStream in = httpConn.getInputStream();
            OutputStream out = response.getOutputStream();

            byte[] buffer = new byte[4096];
            int bytesRead;

            // 读取输入流并将其写入输出流
            while ((bytesRead = in.read(buffer)) != -1) {
                out.write(buffer, 0, bytesRead);
            }

            // 确保所有数据都已刷新到输出流
            out.flush();
        } catch (IOException e) {
            try {
                response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "Error retrieving file from " + path);
            } catch (IOException ex) {
                ex.printStackTrace();
            }
            e.printStackTrace();

        } finally {
            if (httpConn != null) {
                httpConn.disconnect();
            }
        }

    }

    public void setRequestHeader(HttpServletRequest request, HttpURLConnection httpConn) {
        String _token = request.getHeader("_token");
        String sign = request.getHeader("sign");
        Map<String, String> _cookies = cookieToJson(_token);

        httpConn.setRequestProperty("Accept", "application/json, text/plain, */*");
        httpConn.setRequestProperty("Accept-Language", "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7");
        httpConn.setRequestProperty("Authorization", _cookies.get("authorization"));
        httpConn.setRequestProperty("CMS-DEVICE", "default");
        httpConn.setRequestProperty("Cache-Control", "no-cache");
        httpConn.setRequestProperty("Connection", "keep-alive");
        httpConn.setRequestProperty("Content-Type", "application/json;charset=UTF-8");
        httpConn.setRequestProperty("Cookie", _token);
        httpConn.setRequestProperty("INNER-HCY-ROUTER-HTTPS", "1");
        httpConn.setRequestProperty("Origin", "https://yun.139.com");
        httpConn.setRequestProperty("Pragma", "no-cache");
        httpConn.setRequestProperty("Referer", "https://yun.139.com/w/");
        httpConn.setRequestProperty("Sec-Fetch-Dest", "empty");
        httpConn.setRequestProperty("Sec-Fetch-Mode", "cors");
        httpConn.setRequestProperty("Sec-Fetch-Site", "same-origin");
        httpConn.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36");
        httpConn.setRequestProperty("X-Deviceinfo", "||9|7.13.5|chrome|127.0.0.0|||windows 10||zh-CN|||");
        httpConn.setRequestProperty("caller", "web");
        httpConn.setRequestProperty("mcloud-channel", "1000101");
        httpConn.setRequestProperty("mcloud-client", "10701");
        httpConn.setRequestProperty("mcloud-route", "001");
        httpConn.setRequestProperty("mcloud-sign", sign);
        httpConn.setRequestProperty("mcloud-skey", _cookies.get("skey"));
        httpConn.setRequestProperty("mcloud-version", "7.13.5");
        httpConn.setRequestProperty("sec-ch-ua", "\"Not)A;Brand\";v=\"99\", \"Google Chrome\";v=\"127\", \"Chromium\";v=\"127\"");
        httpConn.setRequestProperty("sec-ch-ua-mobile", "?0");
        httpConn.setRequestProperty("sec-ch-ua-platform", "\"Windows\"");
        httpConn.setRequestProperty("x-SvcType", "1");
        httpConn.setRequestProperty("x-huawei-channelSrc", "10000034");
        httpConn.setRequestProperty("x-inner-ntwk", "2");
        httpConn.setRequestProperty("x-m4c-caller", "PC");
        httpConn.setRequestProperty("x-m4c-src", "10002");
        httpConn.setRequestProperty("x-yun-api-version", "v1");
        httpConn.setRequestProperty("x-yun-app-channel", "10000034");
        httpConn.setRequestProperty("x-yun-channel-source", "10000034");
        httpConn.setRequestProperty("x-yun-client-info", "||9|7.13.5|chrome|127.0.0.0|||windows 10||zh-CN|||");
        httpConn.setRequestProperty("x-yun-module-type", "100");
        httpConn.setRequestProperty("x-yun-svc-type", "1");

    }

    public void setRequestHeaderUpload(HttpServletRequest request, HttpURLConnection httpConn) {
        String _token = request.getHeader("_token");
        String filename = request.getParameter("filename");
        String uploadtaskID = request.getParameter("uploadtaskID");
        int contentSize = ((MultiReadHttpServletRequest) request).getBody().length;

        httpConn.setRequestProperty("Accept", "*/*");
        httpConn.setRequestProperty("Accept-Language", "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7");
        httpConn.setRequestProperty("Cache-Control", "no-cache");
        httpConn.setRequestProperty("Connection", "keep-alive");
        httpConn.setRequestProperty("Content-Type", "text/plain;name=" + filename);
        httpConn.setRequestProperty("Cookie", _token);
        httpConn.setRequestProperty("Origin", "https://yun.139.com");
        httpConn.setRequestProperty("Pragma", "no-cache");
        httpConn.setRequestProperty("Range", "bytes=0-" + (contentSize - 1));
        httpConn.setRequestProperty("Referer", "https://yun.139.com/");
        httpConn.setRequestProperty("Sec-Fetch-Dest", "empty");
        httpConn.setRequestProperty("Sec-Fetch-Mode", "cors");
        httpConn.setRequestProperty("Sec-Fetch-Site", "same-site");
        httpConn.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36");
        httpConn.setRequestProperty("contentSize", String.valueOf(contentSize));
        httpConn.setRequestProperty("rangeType", "0");
        httpConn.setRequestProperty("sec-ch-ua", "\"Not)A;Brand\";v=\"99\", \"Google Chrome\";v=\"127\", \"Chromium\";v=\"127\"");
        httpConn.setRequestProperty("sec-ch-ua-mobile", "?0");
        httpConn.setRequestProperty("sec-ch-ua-platform", "\"Windows\"");
        httpConn.setRequestProperty("uploadtaskID", uploadtaskID);
    }


    public static Map<String, String> cookieToJson(String cookieString) {
        Map<String, String> cookieMap = new HashMap<>();
        String[] cookiePairs = cookieString.split(";");

        for (String pair : cookiePairs) {
            String[] keyAndValue = pair.split("=");
            if (keyAndValue.length == 2) {
                String key = keyAndValue[0].trim();
                String value = keyAndValue[1].trim();
                cookieMap.put(key, value);
            }
        }

        return cookieMap;
    }
}
