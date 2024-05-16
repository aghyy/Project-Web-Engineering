<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" indent="yes" encoding="UTF-8"/>
  
  <xsl:template match="/">
    <xsl:apply-templates select="//lesson"/>
  </xsl:template>
  
  <xsl:template match="lesson">
    <xsl:variable name="day" select="../@id"/>
    <xsl:variable name="begin" select="begin"/>
    <xsl:variable name="end" select="end"/>
    
    <li class="event">
      <xsl:attribute name="style">
        <xsl:text>grid-column: </xsl:text>
        <xsl:value-of select="$day"/>
        <xsl:text>; grid-row: h</xsl:text>
        <xsl:value-of select="$begin"/>
        <xsl:text> / h</xsl:text>
        <xsl:value-of select="$end"/>
        <xsl:text>;</xsl:text>
      </xsl:attribute>
      
      <h3><xsl:value-of select="name"/></h3>
      <p><xsl:value-of select="person"/></p>
      <p><xsl:value-of select="room"/></p>

      <br />

      <p>Dauer: <xsl:value-of select="total_time"/></p>
      <p><xsl:value-of select="substring($begin, 1, 2)"/>:<xsl:value-of select="substring($begin, 4)"/> - <xsl:value-of select="substring($end, 1, 2)"/>:<xsl:value-of select="substring($end, 4)"/></p>
    </li>
  </xsl:template>
</xsl:stylesheet>