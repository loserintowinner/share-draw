package com.mxgraph.extend;

import javax.servlet.ServletContextEvent;
import javax.servlet.ServletContextListener;

public class EnvironmentVariableListener implements ServletContextListener {

    @Override
    public void contextInitialized(ServletContextEvent sce) {
        // 设置环境变量
        System.out.println("start server");
        System.setProperty("sun.net.http.allowRestrictedHeaders", "true");
        System.setProperty("ENABLE_DRAWIO_PROXY", "1");
    }

    @Override
    public void contextDestroyed(ServletContextEvent sce) {
        // 在这里可以进行清理工作
    }
}
