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
        String chartId = request.getParameter("chartId");
        String file = OwnCloudServlet.loadFile(chartId);
        if (file != null) {
            response.setStatus(HttpServletResponse.SC_OK);
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
//            writer.println("<script type=\"text/javascript\" src=\"https://viewer.diagrams.net/js/viewer-static.min.js\"></script>");
            writer.println("<script type=\"text/javascript\" src=\"js/viewer-static.min.js\"></script>");
            writer.println("</body>");
            writer.println("</html>");
            writer.flush();
        } else {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
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


}
