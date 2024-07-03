package com.mxgraph.extend;

import com.google.gson.JsonObject;
import com.mxgraph.extend.owncloud.OwnCloudServlet;
import com.mxgraph.extend.owncloud.SkipSSLVerification;

import javax.net.ssl.HttpsURLConnection;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLDecoder;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;

public class EmbedServlet extends HttpServlet {

    /**
     * @see HttpServlet#doPost(HttpServletRequest request, HttpServletResponse response)
     */
    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
        String file = loadFile(request, response);
        if (response.getStatus() == HttpServletResponse.SC_OK) {
            response.setContentType("text/html;charset=utf-8");

            PrintWriter writer = response.getWriter();
            writer.println("<html>");
            writer.println("<head><title>Document</title><meta charset=\"utf-8\"></head>");
            writer.println("<body>");

            writer.print("<div class=\"mxgraph\" style=\"max-width:100%;border:1px solid transparent;\" data-mxgraph=\"");

            JsonObject jsonObject = new JsonObject();
            jsonObject.addProperty("highlight", "#0000ff");
            jsonObject.addProperty("nav", true);
            jsonObject.addProperty("resize", true);
            jsonObject.addProperty("page", 0);
            jsonObject.addProperty("toolbar", "pages zoom layers tags lightbox");
            jsonObject.addProperty("edit", "_blank");
            jsonObject.addProperty("xml", file);
            writer.print(htmlEntities(jsonObject.toString()));
//            System.out.println(htmlEntities(jsonObject.toString()));

            writer.println("\" > </div >");
            writer.println("<script type=\"text/javascript\" src=\"https://viewer.diagrams.net/js/viewer-static.min.js\"></script>");

            writer.println("</body>");
            writer.println("</html>");
            writer.flush();
        }
    }

    public String htmlEntities(String s) {
        s = s.replaceAll("&", "&amp;"); // 38 26
        s = s.replaceAll("<", "&lt;"); // 60 3C
        s = s.replaceAll(">", "&gt;"); // 62 3E


        s = s.replaceAll("\"", "&quot;"); // 34 22
        s = s.replaceAll("'", "&#39;"); // 39 27


        s = s.replaceAll("\n", "&#xA;"); // 注意：HTML中通常不使用此方式来表示换行


        s = s.replaceAll("\t", "&#x9;"); // 制表符转义


        return s;
    }


    public static String loadFile(HttpServletRequest request, HttpServletResponse response) {
        HttpURLConnection httpConn = null;
        try {
            String chartId = request.getParameter("chartId");

            URL url = new URL(EnvironmentVariableListener.OWNCLOUD_SERVICE_URL + "/f/" + chartId + "/?dl=1");
            httpConn = (HttpURLConnection) url.openConnection();
            httpConn.setRequestMethod("GET");
            httpConn.setRequestProperty("Cookie", request.getHeader("cookie"));
            SkipSSLVerification.trustAllHosts((HttpsURLConnection) httpConn);

            int responseCode = httpConn.getResponseCode();
            if (responseCode == HttpServletResponse.SC_MOVED_PERMANENTLY
                    || responseCode == HttpServletResponse.SC_MOVED_TEMPORARILY) {
                // 获取重定向的URL
                String redirectUrl = httpConn.getHeaderField("Location");
                URL newUrl = new URL(redirectUrl);

                httpConn.disconnect();
                httpConn = (HttpURLConnection) newUrl.openConnection();
                httpConn.setRequestMethod("GET");
                httpConn.setRequestProperty("Cookie", request.getHeader("cookie"));
                SkipSSLVerification.trustAllHosts((HttpsURLConnection) httpConn);

                responseCode = httpConn.getResponseCode();
            }
            if (responseCode == HttpServletResponse.SC_OK) {
                response.setStatus(HttpServletResponse.SC_OK);

                BufferedReader in = new BufferedReader(new InputStreamReader(httpConn.getInputStream(), "UTF-8"));
                String inputLine;
                StringBuffer sb = new StringBuffer();
                while ((inputLine = in.readLine()) != null) {
                    sb.append(inputLine);
                }
                in.close();

                return sb.toString();
            }

        } catch (IOException e) {
            e.printStackTrace();
        } finally {
            if (httpConn != null) {
                httpConn.disconnect();
            }
        }
        // fail
        response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
        return null;
    }

}
