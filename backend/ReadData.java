package backend;

import java.net.URL;
import java.util.Scanner;

public class ReadData {

    public static void main(String[] args) throws Exception {
        Scanner scanner = new Scanner(new URL("https://rapla.dhbw-karlsruhe.de/rapla?page=calendar&user=li&file=TINF23B6&day=12&month=3&year=2024&today=Heute").openStream());
        String rawHtml = "";
        while (scanner.hasNextLine()) {
            rawHtml = rawHtml + "\r\n" + scanner.nextLine();
            System.out.println(rawHtml);
        }
        scanner.close();
        filterData(rawHtml);
    }

    public static void filterData(String data) {
        String weekBlocks = "";

    }
}
