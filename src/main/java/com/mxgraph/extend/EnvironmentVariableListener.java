package com.mxgraph.extend;

import javax.servlet.ServletContext;
import javax.servlet.ServletContextEvent;
import javax.servlet.ServletContextListener;
import java.io.IOException;
import java.util.Properties;

public class EnvironmentVariableListener implements ServletContextListener {

    public static ServletContext servletContext = null;

    @Override
    public void contextInitialized(ServletContextEvent sce) {
        // 设置环境变量
        System.out.println("start server");
        System.setProperty("sun.net.http.allowRestrictedHeaders", "true");
        System.setProperty("ENABLE_DRAWIO_PROXY", "1");

        servletContext = sce.getServletContext();
    }

    @Override
    public void contextDestroyed(ServletContextEvent sce) {
        // 在这里可以进行清理工作
    }
}
