package logger_and_report.entities;

import management.environment.LoggerEnvironment;
import management.sessions_and_browser.Sessions;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;


public class SuitesFilesManagement {

    private static Set<String> getFilesInDirectory(String directoryPath) {
        try {
            return Files.list(Paths.get(directoryPath))
                    .filter(Files::isRegularFile)
                    .map(p -> p.getFileName().toString())
                    .collect(Collectors.toSet());
        } catch (IOException e) {
            Sessions.getCurrentSession().getLoggerSession().FATAL("Suite Files Name can't be pushed to the file list" + e.getMessage());
            return new HashSet<>();
        }
    }

    private static Set<String> getFileContents(String filePath) {
        try {
            return new HashSet<>(Files.readAllLines(Paths.get(filePath)));
        } catch (IOException e) {
            System.out.println("Suite Files Name is empty or can't be read\n" + e.getMessage());
            return new HashSet<>();
        }
    }

    private static void writeFilesToFile(String filePath, Set<String> files) {
        try (FileWriter writer = new FileWriter(filePath)) {
            for (String file : files) {
                writer.write(file + "\n");
            }
        } catch (IOException e) {
            Sessions.getCurrentSession().getLoggerSession().FATAL("Suite Files Name can't be written to the file\n" + e.getMessage());
        }
    }

    public static void updateSuitesFiles() {
        String directoryPathForSuites = LoggerEnvironment.get().getLoggerSuiteInfoDirectory();
        String filePath = LoggerEnvironment.get().getLoggerSuitesFileName();

        Set<String> directoryFiles = getFilesInDirectory(directoryPathForSuites);
        Set<String> fileFiles = getFileContents(filePath);

        if (!new File(filePath).exists()) {
            writeFilesToFile(filePath, directoryFiles);
        } else {
            fileFiles.retainAll(directoryFiles);
            fileFiles.addAll(directoryFiles.stream().filter(f -> !fileFiles.contains(f)).collect(Collectors.toSet()));
            writeFilesToFile(filePath, fileFiles);
        }
    }

}
